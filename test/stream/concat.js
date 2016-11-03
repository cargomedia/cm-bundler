var path = require('path');
var assert = require('chai').assert;
var concat = require('../../lib/stream/concat');
var dataDir = path.join(__dirname, '../_data');

var though = require('through2');
var VinylFile = require('vinyl');
var sourcemaps = require('gulp-sourcemaps');


describe('stream: concat', function() {

  it('none', function(done) {
    var stream = though.obj();

    stream
      .pipe(
        concat([])
      )
      .pipe(though.obj(function(file, encoding) {
        assert.equal(file.contents.toString(encoding), '');
        done();
      }));

    stream.push(null);
  });

  it('no input', function(done) {
    var stream = though.obj();

    stream
      .pipe(
        concat([path.join(dataDir, 'concat', '*.js')])
      )
      .pipe(though.obj(function(file, encoding) {
        assert.isObject(file.sourceMap);
        assert.deepEqual(file.contents.toString(encoding).split("\n"), [
          '//_010', '',
          '//001', '',
          '//010', ''
        ]);
        done();
      }));

    stream.push(null);
  });

  it('no concat', function(done) {
    var stream = though.obj();

    stream
      .pipe(
        concat([])
      )
      .pipe(though.obj(function(file, encoding) {
        assert.isObject(file.sourceMap);
        assert.equal(file.contents.toString(encoding), '//stream');
        done();
      }));

    stream.push(new VinylFile({
      cwd: '/',
      base: '/',
      path: '/stream.js',
      contents: new Buffer('//stream')
    }));
    stream.push(null);
  });

  it('simple', function(done) {
    var stream = though.obj();

    stream
      .pipe(
        concat([path.join(dataDir, 'concat', '*.js')])
      )
      .pipe(though.obj(function(file, encoding) {
        assert.isObject(file.sourceMap);
        assert.deepEqual(file.contents.toString(encoding).split("\n"), [
          '//_010', '',
          '//001', '',
          '//010', '',
          '//stream'
        ]);
        done();
      }));

    stream.push(new VinylFile({
      cwd: '/',
      base: '/',
      path: '/stream.js',
      contents: new Buffer('//stream')
    }));
    stream.push(null);
  });

  it('recursive', function(done) {
    var stream = though.obj();
    stream
      .pipe(
        concat([path.join(dataDir, 'concat', '**/*.js')])
      )
      .pipe(though.obj(function(file, encoding) {
        assert.isObject(file.sourceMap);
        assert.deepEqual(file.contents.toString(encoding).split("\n"), [
          '//_001/001', '',
          '//_001/010', '',
          '//_010', '',
          '//001', '',
          '//010', '',
          '//sub/001', '',
          '//sub/010', '',
          '//stream'
        ]);
        done();
      }));

    stream.push(new VinylFile({
      cwd: '/',
      base: '/',
      path: '/stream.js',
      contents: new Buffer('//stream')
    }));
    stream.push(null);
  });


  it('sourcemaps', function(done) {
    var stream = though.obj();

    stream
      .pipe(
        sourcemaps.init({loadMaps: true})
      )
      .pipe(
        concat([path.join(dataDir, 'concat', '*.js')])
      )
      .pipe(though.obj(function(file, encoding) {
        assert.deepEqual(file.contents.toString(encoding).split("\n"), [
          '//_010', '',
          '//001', '',
          '//010', '',
          '//stream'
        ]);

        assert.isObject(file.sourceMap);

        var sources = file.sourceMap.sources;
        assert.isArray(sources);
        assert.equal(sources.length, 4);
        assert.match(sources[0], /\/_010\.js$/);
        assert.match(sources[1], /\/001\.js$/);
        assert.match(sources[2], /\/010\.js$/);
        assert.match(sources[3], /stream\.js$/);

        var sourcesContent = file.sourceMap.sourcesContent;
        assert.isArray(sourcesContent);
        assert.equal(sourcesContent.length, 4);
        assert.equal(sourcesContent[0], '//_010\n');
        assert.equal(sourcesContent[1], '//001\n');
        assert.equal(sourcesContent[2], '//010\n');
        assert.equal(sourcesContent[3], '//stream');

        done();
      }));

    stream.push(new VinylFile({
      cwd: '/',
      base: '/',
      path: '/stream.js',
      contents: new Buffer('//stream')
    }));

    stream.push(null);
  });
});
