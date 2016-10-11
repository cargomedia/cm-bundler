var through = require('through2');

module.exports = {
  code: function() {
    return through.obj(function(file, encoding, next) {
      this.push(file.contents);
      next();
    });
  },
  sourcemaps: function() {
    return through.obj(function(file, encoding, next) {
      this.push(file.sourceMap ? JSON.stringify(file.sourceMap) : '//# no source maps generated!');
      next();
    });
  }
};
