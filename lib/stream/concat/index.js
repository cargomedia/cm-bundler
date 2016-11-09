var path = require('path');
var through = require('through2');
var sourcemaps = require('gulp-sourcemaps');
var ConcatFiles = require('concat-with-sourcemaps');
var VinylFile = require('vinyl');
var vinyl = require('../source/vinyl');

var cache = require('./cache');

/**
 * @param {String[]} patterns
 * @param {String} baseDir
 * @returns {DestroyableTransform}
 * @constructor
 */
function Concat(patterns, baseDir) {
  var stream = through.obj();

  patterns = patterns.map(function(pattern) {
    return !path.isAbsolute(pattern) ? path.join(baseDir, pattern) : pattern;
  });

  if (patterns.length > 0) {
    var cachedConcatResult = cache.get(patterns);
    if (cachedConcatResult) {
      stream.push(cachedConcatResult.file);
      stream.end();
    } else {
      var mergedFile = new ConcatFiles(true, 'concat.js', '\n');
      vinyl(patterns)
        .pipe(sourcemaps.init({loadMaps: true}))
        .pipe(through.obj(
          function(file, _, next) {
            mergedFile.add(file.path, file.contents, file.sourceMap);
            next();
          },
          function() {
            var file = new VinylFile({
              cwd: '/',
              base: '/',
              path: '/concat.js',
              contents: mergedFile.content
            });
            if (mergedFile._sourceMap) {
              file.sourceMap = mergedFile._sourceMap.toJSON();
            }
            cache.set(patterns, file);
            stream.push(file);
            stream.end();
          }
        ));
    }
  } else {
    stream.end();
  }
  return stream;
}

Concat.cache = cache;
module.exports = Concat;
