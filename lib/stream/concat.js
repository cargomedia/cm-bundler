var through = require('through2');
var sourcemaps = require('gulp-sourcemaps');
var ConcatFiles = require('concat-with-sourcemaps');
var condition = require('./condition');
var vinyl = require('./source/vinyl');
var VinylFile = require('vinyl');

module.exports = function(patterns) {
  var done = 0;
  var filesIn = new ConcatFiles(true, 'bundle.js', '\n');
  var filesConcat = new ConcatFiles(true, 'concat.js', '\n');
  var streamOut = concatTo(filesIn, merge);
  var streamConcat = patterns.length > 0 ? vinyl(patterns).pipe(addSourcemaps()).pipe(concatTo(filesConcat, merge)) : merge();
  return streamOut;

  function concatTo(target, flush) {
    return through.obj(function(file, _, next) {
      target.add(file.path, file.contents, file.sourceMap);
      next();
    }, flush);
  }

  function addSourcemaps() {
    return sourcemaps.init({loadMaps: true});
  }

  function merge() {
    if (2 === ++done) {
      var result = new ConcatFiles(true, 'merged.js', '\n');
      if (filesConcat.content.length && filesIn.content.length) {
        result.add('/concat.js', filesConcat.content, filesConcat.sourceMap);
        result.add('/bundle.js', filesIn.content, filesIn.sourceMap);
      } else if (filesConcat.content.length) {
        result = filesConcat;
      } else if (filesIn.content.length) {
        result = filesIn;
      }

      var joinedFile = new VinylFile({
        cwd: '/',
        base: '/',
        path: '/merged.js',
        contents: result.content
      });
      if (result.sourceMap) {
        joinedFile.sourceMap = JSON.parse(result.sourceMap);
      }
      streamOut.push(joinedFile);
      streamOut.push(null);
    }
  }
};
