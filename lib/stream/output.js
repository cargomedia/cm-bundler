var through = require('through2');
var sourcemaps = require('gulp-sourcemaps');

module.exports = function(options) {
  return through.obj(function(file, encoding, next) {
    var output = '';
    if(options && options.sourcemaps) {
      output = (file.sourceMap ? JSON.stringify(file.sourceMap) : '//# no source maps generated!');
    } else if (file.contents){
      output = file.contents.toString(encoding);
    } else {
      output = file;
    }
    process.stdout.write(output + "\n");
    next();
  });
};
