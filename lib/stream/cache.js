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
   * @returns {Stream}
   */
  get: function(key, getter) {
    if (this._cache.has(key)) {
      console.log('from cache: %s', key);
      return this._unserialize(key);
    } else {
      console.log('set cache: %s', key);
      return getter().pipe(this._serialize(key));
    }
  },

  /**
   * @param {String} key
   * @returns {DestroyableTransform}
   * @private
   */
  _serialize: function(key) {
    var data = null;
    var cache = this._cache;
    return through.obj(read, flush);

    function read(file, encoding, next) {
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
      cache.set(key, JSON.stringify(data));
      data = null;
      this.push(null);
    }
  },

  /**
   * @param {String} key
   * @returns {Stream}
   * @private
   */
  _unserialize: function(key) {
    var stream = through.obj();
    var data = JSON.parse(this._cache.get(key));
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

module.exports = StreamCache;
