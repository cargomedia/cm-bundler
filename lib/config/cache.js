var helper = require('../util/helper');
var Promise = require('bluebird');
var LRU = require('lru-cache');
var BundlerConfig = require('./index');
var logger = require('../util/logger');
var semaphore = require('semaphore');

var getNamespace = require('continuation-local-storage').getNamespace;
var session = getNamespace('cm-bundler.request.session');

/**
 * @class ConfigCache
 * @param {Number} [max=20]
 * @param {Number} [maxAge=24*60*60*1000]
 * @param {Number} [timeout=5000]
 */
function ConfigCache(max, maxAge, timeout) {
  this._cache = LRU({
    max: max || 20,
    maxAge: maxAge || 24 * 60 * 60 * 1000,
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
   * @param {BundlerConfig~config} jsonConfig
   * @returns {Promise}
   */
  get: function(jsonConfig) {
    var timeout = this._timeout;
    var id = helper.hash(jsonConfig);
    var lock = this.getLock(id);
    var fillCache = this._fillCache.bind(this);
    return new Promise(function(resolve, reject) {
      lock.take(session.bind(function(leave) {
        fillCache(id, jsonConfig)
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
   * @param {BundlerConfig~config} jsonConfig
   * @param {String} id
   * @returns {Promise}
   */
  _fillCache: function(id, jsonConfig) {
    var cache = this._cache;
    var timeout = this._timeout;
    var config = cache.get(id);
    if (!config) {
      config = new BundlerConfig(id, jsonConfig);
      return config
        .initialize()
        .timeout(timeout, 'Failed to get a config instance after ' + (timeout / 1000) + 's')
        .then(function() {
          cache.set(id, config);
          logger.debug('set config in cache');
          session.set('cacheConfig', false);
        })
        .return(config);
    } else {
      logger.debug('get config from cache');
      session.set('cacheConfig', true);
      return Promise.resolve(config);
    }
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
