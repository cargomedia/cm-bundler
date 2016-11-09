var through = require('through2');
var uglify = require('uglify-js');


module.exports = function(options) {
  var data = '';
  return through(transform, flush);

  function transform(buffer, _, next) {
    data += buffer.toString('utf-8');
    next();
  }

  function flush(end) {
    options.fromString = true;
    options.sourceMapInline = true;
    var min = uglify.minify(data, options);
    this.push(Buffer.concat(min.code));
    end();
  }
};
