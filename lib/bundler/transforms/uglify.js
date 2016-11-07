var path = require('path');
var through = require('through2');
var minifier = require('../../util/minifier');
var convert = require('convert-source-map');


module.exports = function(file) {
  var data = '';
  return through(transform, flush);

  function transform(buffer, _, next) {
    data += buffer.toString('utf-8');
    next();
  }

  function flush(end) {
    var min = minifier(file, data);
    this.push(Buffer.concat([
      min.contents,
      new Buffer("\n"),
      new Buffer(convert.fromJSON(min.sourceMap).toComment())
    ]));
    end();
  }
};
