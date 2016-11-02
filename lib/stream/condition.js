var through = require('through2');

module.exports = function(condition, transformer) {
  if (!condition) {
    return through.obj(function(file, _, next) {
      this.push(file);
      next();
    });
  } else {
    return transformer();
  }
};
