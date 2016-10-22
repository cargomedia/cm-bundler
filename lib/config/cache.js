var helper = require('../util/helper');
var Promise = require('bluebird');
var LRU = require('lru-cache');
var BundlerConfig = require('./index');
var logger = require('../util/logger');


/**
 * @class ConfigCache
 * @param {Number} maxAge
 */
function ConfigCache(maxAge) {
  this._cache = LRU({
    maxAge: maxAge || 24 * 60 * 60
  });
}

ConfigCache.prototype = {

  /**
   * @param {BundlerConfig~config} jsonConfig
   * @returns {Promise}
   */
  get: function(jsonConfig) {
    var config = null;
    var key = helper.hash(jsonConfig);
    if (this._cache.has(key)) {
      config = this._cache.get(key);
      logger.info('[%s] config from cache', config.toString());
      return Promise.resolve(config);
    } else {
      config = new BundlerConfig(jsonConfig, key);
      logger.info('[%s] create new config', config.toString());
      return this._setup(config, key);
    }
  },

  /**
   * @param {BundlerConfig} config
   * @param {String} key
   * @returns {Promise}
   * @protected
   */
  _setup: function(config, key) {
    var cache = this._cache;
    return Promise
      .try(function() {
        return config.initialize();
      })
      .then(function() {
        cache.set(key, config);
      })
      .return(config);
  }
};

ConfigCache.prototype.constructor = ConfigCache;


var instance = null;
module.exports = {
  getInstance: function() {
    if (!instance) {
      instance = new ConfigCache();
    }
    return instance;
  }
};
