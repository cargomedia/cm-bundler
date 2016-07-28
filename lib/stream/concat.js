var through = require('through2');
var vfs = require('vinyl-fs');
var concat = require('gulp-concat');
var sourcemaps = require('gulp-sourcemaps');
var ConcatFiles = require('concat-with-sourcemaps');

module.exports = function(files, sourceMaps) {
  return through.obj(function(bundleFile, encoding, callback) {

    if (bundleFile.isStream()) {
      return callback(new Error('cm-bundler.concat: Streaming not supported'));
    }

    vfs.src(files)
      .pipe(sourcemaps.init({loadMaps: true}))
      .pipe(concat('concat.js'))
      .pipe(through.obj(function(concatFile) {
        var result = new ConcatFiles(sourceMaps, 'generated.js', '\n');
        result.add('bundle.js', bundleFile.contents, sourceMaps && bundleFile.sourceMap);
        result.add('concat.js', concatFile.contents, sourceMaps && concatFile.sourceMap);
        var joinedFile = bundleFile.clone({contents: false});
        joinedFile.contents = result.content;
        if(sourceMaps) {
          joinedFile.sourceMap = JSON.parse(result.sourceMap);
        }
        callback(null, joinedFile);
      }));
  });
};
