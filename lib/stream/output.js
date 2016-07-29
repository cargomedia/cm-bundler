var through = require('through2');
var sourcemaps = require('gulp-sourcemaps');

module.exports = function(options) {
  return through.obj(function(file, encoding) {
    if(options.sourcemaps) {
      process.stdout.write((file.sourceMap ? JSON.stringify(file.sourceMap) : '//# no source maps generated!') + "\n");
    } else {
      process.stdout.write(file.contents.toString(encoding) + "\n");
    }
  });
};
