var uglify = require('uglify-js');
var through = require('through2');
var config = require('../../config');

module.exports = function(file) {
  var data = '';
  return through(transform, flush);

  function transform(buffer, _, next) {
    data += buffer.toString('utf-8');
    next();
  }

  function flush(end) {
    var options = config.get('uglify');
    options.fromString = true;
    var mini = uglify.minify(data, options);
    this.push(new Buffer(mini.code));
    end();
  }
};
