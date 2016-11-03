var assert = require('chai').assert;
var path = require('path');
var through = require('through2');
var VinylFile = require('vinyl');
var sourcemaps = require('gulp-sourcemaps');

var concat = require('../../lib/stream/concat');
var remap = require('../../lib/stream/remap');

describe('stream: remap', function() {
  it('no sourcemaps', function(done) {
    var stream = through.obj();
    stream
      .pipe(remap())
      .pipe(through.obj(function(file) {
        assert.isUndefined(file.sourceMap);
        done();
      }));

    stream.push(getVinylFile('/file1.js'));
    stream.push(null);
  });

  it('no options', function(done) {
    var stream = through.obj();
    stream
      .pipe(sourcemaps.init({loadMaps: true}))
      .pipe(concat([]))
      .pipe(remap())
      .pipe(through.obj(function(file) {
        assert.isObject(file.sourceMap);
        assert.deepEqual(file.sourceMap.sources, [
          'file1.js',
          'foo/file2.js'
        ]);
        done();
      }));

    stream.push(getVinylFile('/file1.js'));
    stream.push(getVinylFile('/foo/file2.js'));
    stream.push(null);
  });

  it('matching string', function(done) {
    var stream = through.obj();
    stream
      .pipe(sourcemaps.init())
      .pipe(concat([]))
      .pipe(remap({
        'bar/': '.*foo/',
        'baz/': 'foz/'
      }))
      .pipe(through.obj(function(file) {
        assert.isObject(file.sourceMap);
        assert.deepEqual(file.sourceMap.sources, [
          'file1.js',
          'foo.js',
          'bar/file2.js',
          'bar/file3.js',
          'bar/baz/file4.js'
        ]);
        done();
      }));

    stream.push(getVinylFile('/file1.js'));
    stream.push(getVinylFile('/foo.js'));
    stream.push(getVinylFile('/foo/file2.js'));
    stream.push(getVinylFile('/foobar/foo/file3.js'));
    stream.push(getVinylFile('/foo/foz/file4.js'));
    stream.push(null);
  });

  it('matching regex', function(done) {
    var stream = through.obj();
    stream
      .pipe(sourcemaps.init())
      .pipe(concat([]))
      .pipe(remap({
        'bar': /foo/g
      }))
      .pipe(through.obj(function(file) {
        assert.isObject(file.sourceMap);
        assert.deepEqual(file.sourceMap.sources, [
          'file1.js',
          'bar.js',
          'bar/file2.js',
          'barbar/bar/file3.js'
        ]);
        done();
      }));

    stream.push(getVinylFile('/file1.js'));
    stream.push(getVinylFile('/foo.js'));
    stream.push(getVinylFile('/foo/file2.js'));
    stream.push(getVinylFile('/foobar/foo/file3.js'));
    stream.push(null);
  });

  it('duplication', function(done) {
    var stream = through.obj();

    stream
      .pipe(sourcemaps.init())
      .pipe(concat([]))
      .pipe(remap({'bar/': '.*foo/'}))
      .on('error', function(error) {
        assert.match(error.message, /Failed to remap the source, `bar\/file1.js` path already exists!/);
        done();
      });

    stream.push(getVinylFile('/foo/file1.js'));
    stream.push(getVinylFile('/foobar/foo/file1.js'));
    stream.push(null);
  });

});


function getVinylFile(filepath, content) {
  content = content || '//' + path.basename(filepath);

  return new VinylFile({
    cwd: '/',
    base: '/',
    path: filepath,
    contents: new Buffer(content)
  });

}
