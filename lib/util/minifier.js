var fs = require('graceful-fs');
var uglify = require('uglify-js');
var convert = require('convert-source-map');
var VinylFile = require('vinyl');
var config = require('../config');

/**
 *
 * @param {String} filePath
 * @param {String} [code]
 */
module.exports = function minifier(filePath, code) {
  var options = config.get('uglify');
  options.fromString = true;
  options.sourceMapInline = true;

  code = !code ? fs.readFileSync(filePath, 'utf8') : code;

  var min = uglify.minify(code, options);
  var map = convert.fromJSON(min.map);

  map.setProperty('sources', [filePath]);
  map.setProperty('sourcesContent', [code]);

  var file = new VinylFile({
    cwd: '/',
    base: '/',
    path: filePath,
    contents: new Buffer(convert.removeComments(min.code))
  });
  file.sourceMap = map.toJSON();

  return file;
};
