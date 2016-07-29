var through = require('through2');
var crypto = require('crypto');

module.exports = function() {
  var md5sum = crypto.createHash('md5');
  var stream = through.obj(read, flush);
  return stream;

  function read(file, encoding, next) {
    md5sum.update(file);
    next();
  }

  function flush() {
    stream.push(new Buffer(md5sum.digest('hex')));
    stream.push(null);
  }
};
