var path = require('path');
var deap = require('deap');
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
  this._config = deap(defaultConfig, config || {});
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
    var patterns = [];
    var extensions = this._extensions;
    var config = this.get();
    config.paths.forEach(function(configPath) {
      extensions.forEach(function(ext) {
        patterns.push(path.join(configPath, '**', '*.' + ext));
      });
    });
    return patterns
      .concat(config.libraries)
      .concat(config.entries)
      .concat(config.concat);
  }
};

BundlerConfig.prototype.constructor = BundlerConfig;

module.exports = BundlerConfig;
