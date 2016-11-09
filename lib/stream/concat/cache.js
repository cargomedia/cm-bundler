var LRUCache = require('lru-cache');
var mm = require('micromatch');
var _ = require('underscore');
var helper = require('../../util/helper');
var logger = require('../../util/logger');
var config = require('../../config');

var cache = new LRUCache({
  max: config.get('cache.concat.max', 50),
  maxAge: config.get('cache.concat.maxAge', 60 * 60 * 1000)
});

module.exports = {

  /**
   * @param {String} path
   */
  invalidate: function(path) {
    cache.forEach(function(entry, key) {
      if (mm.any(path, entry.patterns)) {
        logger.debug('remove %s from concat cache', helper.paddingLeft(path, 24));
        cache.del(key);
      }
    });
  },

  /**
   * @param {String[]} patterns
   * @param {VinylFile} file
   */
  set: function(patterns, file) {
    var key = helper.hash(patterns);
    cache.set(key, {
      patterns: _.map(patterns, function(pattern) {
        return '**/' + pattern;
      }),
      file: file
    });
  },

  /**
   * @param {String[]} patterns
   * @returns {{patterns: {String[]}, file: {VinylFile}}|null}
   */
  get: function(patterns) {
    var key = helper.hash(patterns);
    if (cache.has(key)) {
      return cache.get(key);
    }
    return null;
  },

  clear: function() {
    cache.reset();
  }
};
