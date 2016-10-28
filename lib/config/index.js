var path = require('path');
var deap = require('deap');
var _ = require('underscore');
var glob = require('glob');
var Promise = require('bluebird');
var pipeline = require('pumpify').obj;
var VinylFile = require('vinyl');
var through = require('through2');
var bundler = require('../bundler');
var ConfigWatcher = require('./watcher');
var logger = require('../util/logger');
var semaphore = require('semaphore');


/**
 * @typedef {Object} BundlerConfig~config
 * @property {String} bundleName
 * @property {String} baseDir
 * @property {String[]} paths
 * @property {Boolean} uglify
 * @property {{enabled: Boolean, replace: Object}} sourceMaps
 * @property {Browserify~content} content
 * @property {String[]} library
 * @property {String[]} entries
 * @property {String[]} concat
 */
var defaultConfig = {
  bundleName: '.bundle.js',
  baseDir: '/',
  paths: [],
  uglify: false,
  sourceMaps: {
    enabled: false,
    replace: {
      '': /\.\.\//g,
      '.cm-bundler/require': '.*/browser-pack/_prelude.js',
      '.cm-bundler': '.*/cm-bundler'
    }
  },
  content: [],
  libraries: [],
  entries: [],
  concat: []
};

/**
 * @class BundlerConfig
 * @param {String} id
 * @param {BundlerConfig~config} config
 * @param {String[]} [extensions]
 */
function BundlerConfig(config, id, extensions) {
  this._id = id;
  this._cache = {
    key: null,
    data: null
  };
  this._config = deap.merge({}, config || {}, defaultConfig);
  this._extensions = extensions || ['js'];
  this._watcher = new ConfigWatcher(this._getPatterns());
  this._lock = semaphore(1);
  this._timeout = 5000;
}

BundlerConfig.prototype = {

  /**
   * @returns {Promise}
   */
  initialize: function() {
    var self = this;
    var watcher = this._watcher;
    return Promise
      .try(function() {
        return watcher.initialize();
      })
      .then(function() {
        watcher.on('update', function() {
          var start = new Date();
          logger.info('renew: change detected');
          var processStream = self.process();
          processStream
            .on('error', function(error) {
              logger.error('renew:\n%s', error.stack);
            })
            .on('finish', function() {
              logger.info('renew: cache updated in %ss', (new Date() - start) / 1000);
            });
        });
      });
  },

  /**
   * @returns {BundlerConfig~config}
   */
  get: function() {
    return deap({}, this._config);
  },

  /**
   * @returns {String}
   */
  id: function() {
    return this._id;
  },

  /**
   * @returns {String}
   */
  key: function() {
    return this._watcher.getHash();
  },

  /**
   * @returns {Stream}
   */
  process: function() {
    var processTimeout = this._timeout;
    var stream = through.obj();
    var processConfig = this._process.bind(this);
    this._lock.take(function(leave) {
      var timer = setTimeout(function() {
        stream.emit('error', new Error('Timeout: failed to create the bundle after ' + (processTimeout / 1000) + 's'));
        leave();
      }, processTimeout);

      stream
        .on('finish', function() {
          clearTimeout(timer);
          leave();
        });

      processConfig()
        .on('error', function(error) {
          clearTimeout(timer);
          stream.emit('error', error);
          leave();
        })
        .pipe(stream);
    });
    return stream;
  },

  /**
   * @returns {Stream}
   */
  _process: function() {
    if (this._cache.key === this.key()) {
      logger.info('stream from cache');
      return this._getStream();
    } else {
      logger.info('update stream cache');
      return pipeline(
        bundler.process(this),
        this._storeStream()
      );
    }
  },

  /**
   * @returns {Stream}
   * @private
   */
  _getStream: function() {
    var stream = through.obj();
    var data = this._cache.data;
    var vinyl = new VinylFile({
      cwd: data.cwd,
      base: data.base,
      path: data.path,
      contents: new Buffer(data.contents)
    });
    vinyl.sourceMap = data.sourceMap;
    stream.push(vinyl);
    stream.push(null);
    stream.end();
    return stream;
  },

  /**
   * @private
   */
  _storeStream: function() {
    var cache = this._cache;
    var key = this.key();
    var data = null;
    return through.obj(read, flush);

    function read(file, _, next) {
      if (null !== data) {
        return next(new Error('Multiple streamed file not supported'));
      }
      data = {
        cwd: file.cwd,
        base: file.base,
        path: file.path,
        contents: file.contents,
        sourceMap: file.sourceMap
      };
      this.push(file);
      next();
    }

    function flush(done) {
      cache.key = key;
      cache.data = data;
      data = null;
      done();
    }
  },

  /**
   * @returns {String[]}
   * @protected
   */
  _getPatterns: function() {
    var config = this.get();
    var extensions = this._extensions;
    return _
      .chain(config.paths)
      .map(function(sourcePath) {
        return _.map(extensions, function(ext) {
          return path.join(sourcePath, '**', '*.' + ext)
        });
      })
      .flatten()
      .union(
        config.libraries,
        config.entries,
        config.concat
      )
      .filter(function(path) {
        return glob.sync(path).length > 0;
      })
      .value();
  }
};

BundlerConfig.prototype.constructor = BundlerConfig;

module.exports = BundlerConfig;
