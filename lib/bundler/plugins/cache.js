var path = require('path');
var EventEmitter = require('events');
var through = require('through2');
var deap = require('deap');
var LRUCache = require('lru-cache');
var logger = require('../../util/logger');
var helper = require('../../util/helper');
var config = require('../../config');

var cache = new LRUCache({
  max: config.get('cache.concat.max', 1000),
  maxAge: config.get('cache.concat.maxAge', 60 * 60 * 1000)
});

/**
 * @param {Browserify} b
 * @returns {*}
 */
function BundlerCache(b) {

  b.pipeline.get('deps').push(through.obj(function(row, enc, next) {
    var file = row.expose ? b._expose[row.id] : row.file;
    cache.set(file, {
      source: row.source,
      deps: deap.clone(row.deps)
    });
    this.push(row);
    next();
  }));

  var depsCache = [];
  cache.forEach(function(value, key) {
    depsCache[key] = value;
  });

  b._mdeps.cache = deap(b._mdeps.cache || {}, depsCache);

  return b;
}

/**
 * @param {String} id
 */
BundlerCache.invalidate = function(id) {
  if (cache.has(id)) {
    logger.debug('remove %s from browserify cache', helper.paddingLeft(id, 24));
    cache.del(id);
  }
};

/**
 * @returns {String[]}
 */
BundlerCache.keys = function() {
  return cache.keys();
};

BundlerCache.clear = function() {
  cache.reset();
};


module.exports = BundlerCache;
