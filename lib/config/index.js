var path = require('path');
var deap = require('deap');
var _ = require('underscore');
var glob = require('glob');
var Promise = require('bluebird');
var bundler = require('../bundler');
var ConfigWatcher = require('./watcher');

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
      '_pack/.prelude': '.*/browser-pack/_prelude.js'
    }
  },
  content: [],
  libraries: [],
  entries: [],
  concat: []
};

/**
 * @class BundlerConfig
 * @param {String} key
 * @param {BundlerConfig~config} config
 * @param {String[]} [extensions]
 */
function BundlerConfig(config, key, extensions) {
  this._key = key;
  this._config = deap.merge({}, config || {}, defaultConfig);
  this._extensions = extensions || ['js'];
  this._watcher = new ConfigWatcher(this._getPatterns());
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
          bundler.process(self);
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
  key: function() {
    return this._key;
  },

  /**
   * @returns {String}
   */
  liveKey: function() {
    return this._watcher.getHash();
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
