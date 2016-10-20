var hash = require('../util/hash');
var Promise = require('bluebird');
var LRU = require('lru-cache');
var BundlerConfig = require('./index');

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
    var self = this;
    return Promise.try(function() {
      var key = hash.md5(jsonConfig);
      return self._cache.has(key) ? self._cache.get(key) : self._create(jsonConfig, key);
    })
  },

  /**
   * @param {BundlerConfig~config} jsonConfig
   * @param {String} key
   * @returns {Promise}
   * @protected
   */
  _create: function(jsonConfig, key) {
    var self = this;
    console.log('create config', key);
    var config = new BundlerConfig(jsonConfig, key);
    return Promise
      .try(function() {
        return config.initialize();
      })
      .then(function() {
        self._cache.set(key, config);
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
