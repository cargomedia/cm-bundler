var through = require('through2');
var crypto = require('crypto');

module.exports = function() {
  var hash = crypto.createHash('md5');
  var stream = through.obj(read, flush);
  return stream;

  function read(content, encoding, next) {
    hash.update(content);
    next();
  }

  function flush() {
    stream.push(new Buffer(hash.digest('hex')));
    stream.push(null);
  }
};
