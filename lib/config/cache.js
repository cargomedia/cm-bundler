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
    var cache = this._cache;
    return Promise
      .try(function() {
        var config = null;
        var id = helper.hash(jsonConfig);
        if (!cache.has(id)) {
          config = new BundlerConfig(jsonConfig, id);
          return config
            .initialize()
            .then(function() {
              cache.set(id, config);
              logger.info('[%s] config created', config.toString());
              return config;
            });
        }
        config = cache.get(id);
        logger.info('[%s] config from cache', config.toString());
        return config;
      });
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
