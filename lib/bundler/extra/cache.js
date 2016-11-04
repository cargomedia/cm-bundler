var path = require('path');
var EventEmitter = require('events');
var through = require('through2');
var deap = require('deap');
var LRUCache = require('lru-cache');
var logger = require('../../util/logger');
var helper = require('../../util/helper');
var config = require('../../config');


module.exports = {

  /** @type {{String: Object}} */
  _cache: new LRUCache({
    max: config.get('cache.concat.max', 1000),
    maxAge: config.get('cache.concat.maxAge', 60 * 60 * 1000)
  }),

  /**
   * @returns {Object} browserify options
   */
  prepare: function() {
    var options = {
      cache: {}
    };
    this._cache.forEach(function(value, key) {
      options.cache[key] = value;
    });
    return options;
  },

  /**
   * @param {Browserify} browserify
   * @returns {Browserify}
   */
  process: function(browserify) {
    var cache = this._cache;

    browserify.pipeline.get('deps').push(through.obj(function(row, enc, next) {
      var file = row.expose ? browserify._expose[row.id] : row.file;
      cache.set(file, {
        source: row.source,
        deps: deap.clone(row.deps)
      });
      this.push(row);
      next();
    }));

    return browserify;
  },

  /**
   * @param {String} id
   */
  invalidate: function(id) {
    var cache = this._cache;
    if (cache.has(id)) {
      logger.debug('remove %s from browserify cache', helper.paddingLeft(id, 24));
      cache.del(id);
    }
  },

  clear: function() {
    this._cache.reset();
  }
};
