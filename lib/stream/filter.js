var through = require('through2');
var readonly = require('read-only-stream');

module.exports = {

  /**
   * @returns {DestroyableTransform}
   */
  code: function() {
    return through.obj(function(file, encoding, next) {
      this.push(file.contents);
      next();
    });
  },

  /**
   * @returns {DestroyableTransform}
   */
  sourcemaps: function() {
    return through.obj(function(file, encoding, next) {
      this.push(file.sourceMap ? JSON.stringify(file.sourceMap) : '//# no source maps generated!');
      next();
    });
  },

  /**
   * @returns {DestroyableTransform}
   */
  createResponse: function() {
    var response = {
      content: ''
    };

    var stream = through.obj(read, flush);
    return stream;

    function read(data, _, next) {
      response.content += data;
      next();
    }

    function flush() {
      stream.push(JSON.stringify(response));
      stream.push(null);
    }
  },

  /**
   * @param {Error} error
   * @returns {Readable}
   */
  createErrorResponse: function(error) {
    var stream = through();
    stream.push(JSON.stringify({
      error: error.message,
      stack: error.stack
    }));
    stream.push(null);
    return readonly(stream);
  }
};
