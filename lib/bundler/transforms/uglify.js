var path = require('path');
var uglify = require('uglify-js');
var through = require('through2');
var convert = require('convert-source-map');
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
    options.outSourceMap = 'out.js.map';
    var min = uglify.minify(data, options);

    var source = min.code.replace(/\/\/[#@] ?sourceMappingURL=out.js.map$/, '');
    if (min.map && min.map !== 'null') {
      var map = convert.fromJSON(min.map);
      map.setProperty('sources', [path.basename(file)]);
      map.setProperty('sourcesContent', [data]);
      source += '\n' + map.toComment();
    }

    this.push(new Buffer(source));
    end();
  }
};
