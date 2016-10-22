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
    var id = helper.hash(jsonConfig);
    if (this._cache.has(id)) {
      config = this._cache.get(id);
      logger.info('[%s] config from cache', config.toString());
      return Promise.resolve(config);
    } else {
      config = new BundlerConfig(jsonConfig, id);
      logger.info('[%s] create new config', config.toString());
      return this._setup(config, id);
    }
  },

  /**
   * @param {BundlerConfig} config
   * @param {String} id
   * @returns {Promise}
   * @protected
   */
  _setup: function(config, id) {
    var cache = this._cache;
    return Promise
      .try(function() {
        return config.initialize();
      })
      .then(function() {
        cache.set(id, config);
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
