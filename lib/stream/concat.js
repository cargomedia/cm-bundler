var LRUCache = require('lru-cache');
var path = require('path');
var through = require('through2');
var Promise = require('bluebird');
var _ = require('underscore');
var ConcatFiles = require('concat-with-sourcemaps');
var VinylFile = require('vinyl');
var glob = require('./source/glob');
var debug = require('./debug');
var config = require('../config');
var helper = require('../util/helper');
var logger = require('../util/logger');
var minifier = require('../util/minifier');

var cache = new LRUCache({
  max: config.get('cache.concat.max', 1000),
  maxAge: config.get('cache.concat.maxAge', 60 * 60 * 1000)
});

var caching = function() {
  return through.obj(function(path, _, next) {
    var stream = this;
    Promise
      .try(function() {
        var file = cache.get(path);
        if (file) {
          return file;
        } else {
          file = minifier(path);
          cache.set(path, file);
          return file;
        }
      })
      .then(function(file) {
        stream.push(file);
        next();
      })
  });
};


/**
 * @param {String[]} patterns
 * @param {String} baseDir
 * @returns {DestroyableTransform}
 * @constructor
 */
var Concat = function(patterns, baseDir) {
  patterns = _.map(patterns, function(pattern) {
    return !path.isAbsolute(pattern) ? path.join(baseDir, pattern) : pattern;
  });

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
      var target = new ConcatFiles(true, 'concat.js', '\n');
      glob(patterns)
        .pipe(caching())
        .pipe(through.obj(
          function(file, _, next) {
            target.add(file.path, file.contents, file.sourceMap);
            next();
          },
          function() {
            stream.push(target);
            stream.end();
          }
        ));

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

Concat._cache = function() {
  return cache;
};

Concat.clear = function() {
  cache.reset();
};

Concat.invalidate = function(path) {
  if (cache.has(path)) {
    logger.debug('remove %s from concat cache', helper.paddingLeft(path, 24));
    cache.del(path);
  }
};

module.exports = Concat;
