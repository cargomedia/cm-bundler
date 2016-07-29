var through = require('through2');
var crypto = require('crypto');

module.exports = function() {
  var hash = [];
  var stream = through.obj(read, flush);
  return stream;

  function read(content, encoding, next) {
    hash.push(crypto.createHash('md5').update(content).digest('hex'));
    next();
  }

  function flush() {
    stream.push(new Buffer(crypto.createHash('md5').update(hash.sort().join('')).digest('hex')));
    stream.push(null);
  }
};
