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
    dispose: function(id, config) {
        logger.debug('config removed from cache');
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
  _fillCache: function(id, jsonConfig) {
    var cache = this._cache;
    return Promise
      .try(function() {
        var config = null;
        if (!cache.has(id)) {
          config = new BundlerConfig(id, jsonConfig);
          return config
            .initialize()
            .then(function() {
              cache.set(id, config);
              logger.debug('config created');
              return config;
            });
        }
        config = cache.get(id);
        logger.info('config from cache');
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
