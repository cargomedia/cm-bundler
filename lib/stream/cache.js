var LRU = require('lru-cache');
var through = require('through2');
var VinylFile = require('vinyl');

/**
 * @class StreamCache
 * @param {Number} maxAge
 */
function StreamCache(maxAge) {
  this._cache = LRU({
    maxAge: maxAge || 24 * 60 * 60
  });
}

StreamCache.prototype = {

  /**
   * @param {String} key
   * @param {function:Stream} getter
   * @returns {*|Stream}
   */
  get: function(key, getter) {
    if (this._cache.has(key)) {
      console.log('from cache: %s', key);
      return this._retrieve(key);
    } else {
      console.log('set cache: %s', key);
      return getter().pipe(this._store(key));
    }
  },

  /**
   * @param {String} key
   * @returns {DestroyableTransform}
   * @private
   */
  _store: function(key) {
    var data = null;
    var cache = this._cache;
    return through.obj(read, flush);

    function read(file, _, next) {
      if (null !== data) {
        return next(new Error('Multiple streamed file not supported'));
      }
      data = {
        cwd: file.cwd,
        base: file.base,
        path: file.path,
        contents: file.contents,
        sourceMap: file.sourceMap
      };
      this.push(file);
      next();
    }

    function flush() {
      cache.set(key, data);
      data = null;
      this.push(null);
    }
  },

  /**
   * @param {String} key
   * @returns {Stream}
   * @private
   */
  _retrieve: function(key) {
    var stream = through.obj();
    var data = this._cache.get(key);
    var vinyl = new VinylFile({
      cwd: data.cwd,
      base: data.base,
      path: data.path,
      contents: new Buffer(data.contents)
    });
    vinyl.sourceMap = data.sourceMap;
    stream.push(vinyl);
    stream.push(null);
    return stream;
  }
};

StreamCache.prototype.constructor = StreamCache;

var instance = null;
module.exports = {
  getInstance: function() {
    if (!instance) {
      instance = new StreamCache();
    }
    return instance;
  }
};
