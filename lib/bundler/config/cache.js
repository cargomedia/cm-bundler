var _ = require('underscore');
var Promise = require('bluebird');
var LRU = require('lru-cache');
var helper = require('../../util/helper');
var BundlerConfig = require('./index');
var logger = require('../../util/logger');
var semaphore = require('semaphore');
var session = require('../../session');


/**
 * @class ConfigCache
 * @param {Number} [max=20]
 * @param {Number} [maxAge=24*60*60*1000]
 * @param {Number} [timeout=5000]
 */
function ConfigCache(max, maxAge, timeout) {
  this._cache = LRU({
    max: max || 50,
    maxAge: maxAge || 7 * 24 * 60 * 60 * 1000,
    dispose: function(key, config) {
      config.destroy();
      logger.debug('config destroyed and removed from cache');
    }
  });
  this._timeout = timeout || 5000;
  this._locks = {};
}

ConfigCache.prototype = {

  /**
   * @param {BundlerConfig} config
   * @returns {Promise}
   */
  get: function(config) {
    var timeout = this._timeout;
    var lock = this.getLock(config.id());
    var fillCache = this._fillCache.bind(this);
    return new Promise(function(resolve, reject) {
      lock.take(session.bind(function(leave) {
        fillCache(config)
          .then(resolve, reject)
          .finally(leave);
      }));
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
   * @param {BundlerConfig} config
   * @returns {Promise}
   */
  _fillCache: function(config) {
    var cache = this._cache;
    var timeout = this._timeout;
    var cachedConfig = cache.get(config.id());
    if (!cachedConfig) {
      return config
        .initialize()
        .timeout(timeout, 'Failed to get a config instance after ' + (timeout / 1000) + 's')
        .then(function() {
          cache.set(config.id(), config);
          logger.debug('set config in cache');
          session.set('cacheConfig', false);
        })
        .return(config);
    } else {
      logger.debug('get config from cache');
      session.set('cacheConfig', true);
      return Promise.resolve(cachedConfig);
    }
  }
};

ConfigCache.prototype.constructor = ConfigCache;


var config = require('../../config');
var instance = null;

module.exports = {
  getInstance: function() {
    if (!instance) {
      instance = new ConfigCache(
        config.get('cache.config.max'),
        config.get('cache.config.maxAge'),
        config.get('cache.config.timeout')
      );
    }
    return instance;
  }
};
