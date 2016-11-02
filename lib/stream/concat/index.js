var through = require('through2');
var Promise = require('bluebird');
var sourcemaps = require('gulp-sourcemaps');
var ConcatFiles = require('concat-with-sourcemaps');
var vinyl = require('../source/vinyl');
var VinylFile = require('vinyl');
var debug = require('../debug');


var Concat = function(patterns) {
  var step = new Date();
  var streamConcat = through.obj().pipe(debug('concat    %sms', step));

  var streamConcatFinished = new Promise(function(resolve, reject) {
    var fileFromStream = null;
    streamConcat.on('data', function(file) {
      fileFromStream = file;
    });
    streamConcat.on('finish', function() {
      resolve(fileFromStream);
    });
    streamConcat.on('error', reject);
  });
  streamConcatFinished.finally(function() {
    streamConcat.removeAllListeners();
  });

  var fileIn = new ConcatFiles(true, 'bundle.js', '\n');
  var streamOut = through.obj(
    function(file, _, next) {
      fileIn.add(file.path, file.contents, file.sourceMap);
      next();
    },
    function() {
      streamConcatFinished
        .then(function(fileConcat) {
          var start = new Date();
          var fileOut = merge(fileIn, fileConcat);
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


  function concatFromPatterns(patterns) {
    var stream = through.obj();
    if (patterns.length > 0) {
      var cache = Concat.cache;
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

  function merge(filesIn, filesConcat) {
    var result = new ConcatFiles(true, 'merged.js', '\n');

    if (filesConcat.content.length && filesIn.content.length) {
      var start = new Date();
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

    if (result._sourceMap) {
      joinedFile.sourceMap = result._sourceMap.toJSON();
    }
    return joinedFile;
  }
};

Concat.cache = require('./cache');
module.exports = Concat;
