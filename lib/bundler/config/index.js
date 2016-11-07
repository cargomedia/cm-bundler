var path = require('path');
var deap = require('deap');
var _ = require('underscore');
var glob = require('glob');
var Promise = require('bluebird');
var semaphore = require('semaphore');
var pipeline = require('pumpify').obj;
var VinylFile = require('vinyl');
var through = require('through2');
var ConfigWatcher = require('./watcher');
var bundler = require('../../bundler');
var logger = require('../../util/logger');
var helper = require('../../util/helper');
var session = require('../../session');
var config = require('../../config');


/**
 * @typedef {Object} BundlerConfig~config
 * @property {String} bundleName
 * @property {String} baseDir
 * @property {String[]} paths
 * @property {Boolean} ignoreMissing
 * @property {String[]} watch
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
  ignoreMissing: false,
  watch: [],
  sourceMaps: {
    replace: {
      '.cm-bundler/require': '(^|.*/)browser-pack/_prelude.js',
      '.cm-bundler': '(^|.*/)cm-bundler',
      '': /\.js$/
    }
  },
  content: [],
  libraries: [],
  entries: [],
  concat: []
};

/**
 * @class BundlerConfig
 *
 * @param {BundlerConfig~config} config
 * @param {String} [baseDir=process.cwd()]
 * @param {String[]} [extensions=['js']]
 * @param {Number} [timeout=10000]
 * @param {Number} [updateDelay=100]
 */
function BundlerConfig(config, baseDir, extensions, timeout, updateDelay) {
  this._baseDir = baseDir || process.cwd();
  this._extensions = extensions || ['js'];
  this._timeout = _.isNumber(timeout) ? timeout : 10000;
  this._updateDelay = _.isNumber(updateDelay) ? updateDelay : 100;
  this._updateTimer = null;

  this._config = this._mergeConfig(config);
  this._id = null;

  this._cache = {
    key: null,
    file: null
  };
  this._watcher = new ConfigWatcher(this._getPatterns());
  this._lock = semaphore(1);
}

BundlerConfig.prototype = {

  /**
   * @returns {Promise}
   */
  initialize: function() {
    var watcher = this._watcher;
    var renew = this._renew.bind(this);
    return Promise
      .try(function() {
        if (config.get('watcher.enabled', true)) {
          watcher.on('update', renew);
          return watcher.initialize();
        }
      })
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
    if (!this._id) {
      var config = this.get();
      if ('bundleName' in config) {
        delete config.bundleName;
      }
      this._id = helper.hash(config);
    }
    return this._id;
  },

  /**
   * @returns {String}
   */
  name: function() {
    return this.get().bundleName;
  },

  /**
   * @returns {String}
   */
  key: function() {
    return helper.hash(this.id() + this._watcher.getHash());
  },

  /**
   * @returns {Stream}
   */
  process: function() {
    var processTimeout = this._timeout;
    var stream = through.obj();
    var processConfig = this._process.bind(this);

    this._lock.take(session.bind(function(leave) {
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
    }));
    return stream;
  },

  destroy: function() {
    this._watcher.destroy();
    this._config = null;
    this._cache = null;
  },

  /**
   * @returns {Stream}
   */
  _process: function() {
    if (this._cache.key === this.key()) {
      logger.debug('get bundle stream from cache');
      session.set('cacheStream', true);
      return this._getStream();
    } else {
      logger.debug('build bundle stream');
      session.set('cacheStream', false);
      this._cache.key = null;
      this._cache.file = null;
      return pipeline(
        bundler.process(this),
        this._storeStream()
      );
    }
  },

  /**
   * @param {String} reason
   * @param {String} filePath
   * @private
   */
  _renew: function(reason, filePath) {
    session.run(function() {
      session.set('requestId', 'renew');
      session.set('config', this);

      logger.log('debug', 'invalidate ' + helper.paddingLeft(filePath, 24), {post: reason});
      this._invalidate(path.join(this.get().baseDir, filePath));

      if (!this._updateTimer) {
        this._updateTimer = setTimeout(function() {
          this._updateTimer = null;
          var processStream = this.process();
          session.bindEmitter(processStream);

          var start = new Date();
          processStream
            .on('error', function(error) {
              logger.error('\n%s', error.stack);
            })
            .on('finish', function() {
              logger.info('cache updated in %sms', new Date() - start);
            });

        }.bind(this), this._updateDelay);
      }
    }.bind(this));
  },

  /**
   * @returns {Stream}
   * @private
   */
  _getStream: function() {
    var stream = through.obj();
    var cache = this._cache;
    process.nextTick(function() {
      stream.push(cache.file);
      stream.end();
    });
    return stream;
  },

  /**
   * @private
   */
  _storeStream: function() {
    var cache = this._cache;
    var key = this.key();
    var data = null;
    return through.obj(
      function read(file, _, next) {
        if (null !== cache.file || null !== cache.key) {
          return next(new Error('Multiple streamed file not supported'));
        }
        data = file;
        this.push(file);
        next();
      },
      function(end) {
        cache.key = key;
        cache.file = data;
        end();
      }
    );
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
        config.concat,
        config.watch
      )
      .filter(function(path) {
        return glob.sync(path).length > 0;
      })
      .unique()
      .value();
  },

  /**
   * @param {BundlerConfig~config} config
   * @returns {BundlerConfig~config}
   * @private
   */
  _mergeConfig: function(config) {
    config = config || {};
    return deap.merge({
      baseDir: 'baseDir' in config ? config.baseDir : this._baseDir
    }, config, defaultConfig);
  },

  /**
   * @param {String} path
   * @protected
   */
  _invalidate: function(path) {
    bundler.invalidate(path);
  }
};

BundlerConfig.prototype.constructor = BundlerConfig;

module.exports = BundlerConfig;
