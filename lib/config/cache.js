var helper = require('../util/helper');
var Promise = require('bluebird');
var LRU = require('lru-cache');
var BundlerConfig = require('./index');
var logger = require('../util/logger');
var semaphore = require('semaphore');


/**
 * @class ConfigCache
 * @param {Number} [max=20]
 * @param {Number} [maxAge=24*60*60*1000]
 * @param {Number} [timeout=2000]
 */
function ConfigCache(max, maxAge, timeout) {
  this._cache = LRU({
    max: max || 20,
    maxAge: maxAge || 24 * 60 * 60 * 1000,
    stale: true,
    dispose: function(id, configPromise) {
      if (configPromise.isFulfilled()) {
        logger.info('cache [%s] remove fullfilled config promise', configPromise.value().toString());
      } else {
        logger.info('cache [%s] wait config promise resolution to clear it', id);
        configPromise
          .then(function(config) {

          });
      }
    }
  });
  this._timeout = timeout || 2000;
  this._locks = {};
}

ConfigCache.prototype = {

  /**
   * @param {BundlerConfig~config} jsonConfig
   * @returns {Promise}
   */
  get: function(jsonConfig) {
    var timeout = this._timeout;
    var id = helper.hash(jsonConfig);
    var lock = this.getLock(id);
    var getConfig = this._get.bind(this);
    return new Promise(function(resolve, reject) {
      lock.take(function(leave) {
        getConfig(jsonConfig, id)
          .timeout(timeout, 'Failed to get a config instance after ' + (timeout / 1000) + 's')
          .then(resolve, reject)
          .finally(leave);
      });
    });
  },

  /**
   * @param {String} id
   * @returns {semaphore}
   */
  getLock: function(id) {
    if (!(id in this._locks)) {
      this._locks[id] = semaphore(1);
    }
    return this._locks[id];
  },

  /**
   * @param {BundlerConfig~config} jsonConfig
   * @param {String} id
   * @returns {Promise}
   */
  _get: function(jsonConfig, id) {
    var cache = this._cache;
    return Promise
      .try(function() {
        var config = null;
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
