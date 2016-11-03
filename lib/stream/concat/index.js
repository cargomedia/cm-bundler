var through = require('through2');
var Promise = require('bluebird');
var _ = require('underscore');
var sourcemaps = require('gulp-sourcemaps');
var ConcatFiles = require('concat-with-sourcemaps');
var vinyl = require('../source/vinyl');
var VinylFile = require('vinyl');
var debug = require('../debug');
var helper = require('../../util/helper');

var cache = require('./cache');

/**
 * @param {String[]} patterns
 * @returns {DestroyableTransform}
 * @constructor
 */
var Concat = function(patterns) {
  var step = new Date();
  var streamConcat = through.obj().pipe(debug('concat    %sms', step));
  var promiseConcat = helper.streamPromise(streamConcat);

  var fileIn = new ConcatFiles(true, 'bundle.js', '\n');
  var streamOut = through.obj(
    function(file, _, next) {
      fileIn.add(file.path, file.contents, file.sourceMap);
      next();
    },
    function() {
      promiseConcat
        .then(function(fileConcat) {
          var fileOut = merge(fileConcat, fileIn);
          streamOut.push(fileOut);
          streamOut.push(null);
        })
        .catch(function(error) {
          streamOut.emit('error', error);
        });
    }
  );
  process.nextTick(function() {
    concatFromPatterns(patterns).pipe(streamConcat);
  });
  return streamOut;


  /**
   * @param {String[]} patterns
   * @returns {DestroyableTransform}
   */
  function concatFromPatterns(patterns) {
    var stream = through.obj();
    if (patterns.length > 0) {
      var cachedConcatResult = cache.get(patterns);
      if (cachedConcatResult) {
        stream.push(cachedConcatResult.file);
        stream.end();
      } else {
        var target = new ConcatFiles(true, 'concat.js', '\n');
        vinyl(patterns)
          .pipe(sourcemaps.init({loadMaps: true}))
          .pipe(through.obj(
            function(file, _, next) {
              target.add(file.path, file.contents, file.sourceMap);
              next();
            },
            function() {
              cache.set(patterns, target);
              stream.push(target);
              stream.end();
            }
          ));
      }
    } else {
      stream.end();
    }
    return stream;
  }

  /**
   * @param {VinylFile...} files
   */
  function merge(files) {
    var result = new ConcatFiles(true, 'merged.js', '\n');

    files = _
      .chain(arguments)
      .toArray()
      .filter(function(file) {
        return file && file.content && file.content.length > 0;
      })
      .value();

    if (files.length == 1) {
      result = _.first(files);
    } else if (files.length > 1) {
      files.forEach(function(file, index) {
        result.add('/file.' + index + '.js', file.content, file.sourceMap);
      });
    }

    var joinedFile = new VinylFile({
      cwd: '/',
      base: '/',
      path: '/merged.js',
      contents: result.content
    });
    if (result._sourceMap) {
      joinedFile.sourceMap = result._sourceMap.toJSON();
    }
    return joinedFile;
  }
};

Concat.cache = cache;
module.exports = Concat;
