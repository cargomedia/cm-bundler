var _ = require('underscore');
var through = require('through2');
var ConcatFiles = require('concat-with-sourcemaps');
var VinylFile = require('vinyl');

/**
 * @params {Transform[]} streams
 * @returns {Transform}
 * @constructor
 */
var Merge = function(streams) {
  var done = 0;
  var files = [];
  var stream = through.obj();
  var streamEmitError = stream.emit.bind(stream, 'error');

  streams.forEach(function(stream, index) {
    stream.on('error', streamEmitError);

    stream.pipe(through.obj(
      function(file, _, next) {
        files[index] = file;
        next();
      },
      function(end) {
        stream.removeListener('error', streamEmitError);
        streamDone();
        end();
      }
    ));
  });

  return stream;

  function streamDone() {
    if (++done === streams.length) {
      var mergedFile = new ConcatFiles(true, 'bundle.js', '\n');
      files.forEach(function(file, index) {
        mergedFile.add('/file.' + index + '.js', file.contents, file.sourceMap);
      });
      var joinedFile = new VinylFile({
        cwd: '/',
        base: '/',
        path: '/merged.js',
        contents: mergedFile.content
      });
      if (mergedFile._sourceMap) {
        joinedFile.sourceMap = mergedFile._sourceMap.toJSON();
      }
      stream.push(joinedFile);
      stream.end();
    }
  }
};

module.exports = Merge;
