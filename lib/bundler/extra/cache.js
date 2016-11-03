var path = require('path');
var EventEmitter = require('events');
var through = require('through2');
var deap = require('deap');
var logger = require('../../util/logger');
var helper = require('../../util/helper');


module.exports = {

  /** @type {{String: Object}} */
  _cache: {},

  /**
   * @returns {Object} browserify options
   */
  prepare: function() {
    return {
      cache: this._cache
    };
  },

  /**
   * @param {Browserify} browserify
   * @returns {Browserify}
   */
  process: function(browserify) {
    var cache = this._cache;

    browserify.pipeline.get('deps').push(through.obj(function(row, enc, next) {
      var file = row.expose ? browserify._expose[row.id] : row.file;
      cache[file] = {
        source: row.source,
        deps: deap.clone(row.deps)
      };
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
    if (id in cache) {
      logger.debug('remove %s from browserify cache', helper.paddingLeft(id, 24));
      delete cache[id];
    }
  },

  clear: function() {
    this._cache = {};
  }
};
