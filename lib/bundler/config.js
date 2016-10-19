var deap = require('deap');
var crypto = require('crypto');

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
 * @param {BundlerConfig~config} config
 */
function BundlerConfig(config) {
  this._config = deap(defaultConfig, config || {});
}

BundlerConfig.prototype = {
  /**
   * @returns {Object}
   */
  get: function() {
    return this._config;
  },

  /**
   * @returns {String}
   */
  key: function() {
    return crypto.createHash('md5').update(JSON.stringify(this.get())).digest('hex');
  }
};

BundlerConfig.prototype.constructor = BundlerConfig;

module.exports = BundlerConfig;
