var path = require('path');
var assert = require('chai').assert;

var Promise = require('bluebird');
var though = require('through2');
var VinylFile = require('vinyl');
var sourcemaps = require('gulp-sourcemaps');
var helper = require('../../lib/util/helper');

var concat = require('../../lib/stream/concat');
var dataDir = path.join(__dirname, '../_data');


describe('stream: concat', function() {

  it('none', function(done) {
    concat.cache.clear();

    concat([]).pipe(though.obj(
      function transform() {
        assert.fail(0, 1, 'transform should not be called');
      },
      function flush() {
        assert.ok(true);
        done();
      }
    ));
  });

  it('simple', function(done) {
    concat.cache.clear();

    concat([path.join(dataDir, 'concat', '*.js')])
      .pipe(though.obj(function(file, encoding) {
        assert.isObject(file.sourceMap);
        assert.deepEqual(file.contents.toString(encoding).split("\n"), [
          "var str = '_010';", '',
          "var str = '001';", '',
          "var str = '010';", ''
        ]);
        done();
      }));
  });

  it('recursive', function(done) {
    concat.cache.clear();

    concat([path.join(dataDir, 'concat', '**/*.js')])
      .pipe(though.obj(function(file, encoding) {
        assert.isObject(file.sourceMap);
        assert.deepEqual(file.contents.toString(encoding).split("\n"), [
          "var str = '_001/001';", '',
          "var str = '_001/010';", '',
          "var str = '_010';", '',
          "var str = '001';", '',
          "var str = '010';", '',
          "var str = 'sub/001';", '',
          "var str = 'sub/010';", '',
          "var str = 'foo/bar/baz';",
          "function foo() {",
          "  return str.replace(/b/, 'p');",
          "}", ''
        ]);
        done();
      }));
  });


  it('sourcemaps', function(done) {
    concat.cache.clear();

    concat([path.join(dataDir, 'concat', '*.js')])
      .pipe(though.obj(function(file, encoding) {
        assert.deepEqual(file.contents.toString(encoding).split("\n"), [
          "var str = '_010';", '',
          "var str = '001';", '',
          "var str = '010';", ''
        ]);

        assert.isObject(file.sourceMap);

        var sources = file.sourceMap.sources;
        assert.isArray(sources);
        assert.equal(sources.length, 3);
        assert.match(sources[0], /\/_010\.js$/);
        assert.match(sources[1], /\/001\.js$/);
        assert.match(sources[2], /\/010\.js$/);

        var sourcesContent = file.sourceMap.sourcesContent;
        assert.isArray(sourcesContent);
        assert.equal(sourcesContent.length, 3);
        assert.equal(sourcesContent[0], "var str = '_010';\n");
        assert.equal(sourcesContent[1], "var str = '001';\n");
        assert.equal(sourcesContent[2], "var str = '010';\n");
        done();
      }));
  });

  it('cache', function() {
    var cache = concat.cache;
    var patterns = [path.join(dataDir, 'concat', '*.js')];
    cache.clear();

    return Promise
      .try(function() {
        assert.isNull(cache.get(patterns));
        var test = concat(patterns)
          .pipe(though.obj(function(file, _, next) {
            assert.isObject(cache.get(patterns));
            this.push(file);
            next();
          }));
        return helper.streamPromise(test);
      })
      .then(function() {
        var data = cache.get(patterns);
        assert.isObject(data);
        data.file.contents = Buffer.concat([data.file.contents, new Buffer('//from cache')]);
        var test = concat(patterns)
          .pipe(though.obj(function(file, _, next) {
            assert.isObject(cache.get(patterns));
            assert.match(file.contents.toString('utf-8'), /\/\/from cache$/);
            this.push(file);
            next();
          }));
        return helper.streamPromise(test);
      });
  });

  it('cache invalidation', function() {
    var cache = concat.cache;
    var patterns = [path.join(dataDir, 'concat', '*.js')];
    cache.clear();

    return Promise
      .try(function() {
        assert.isNull(cache.get(patterns));
        var test = concat(patterns)
          .pipe(though.obj(function(file, _, next) {
            assert.isObject(cache.get(patterns));
            this.push(file);
            next();
          }));
        return helper.streamPromise(test);
      })
      .then(function() {
        assert.isObject(cache.get(patterns));

        cache.invalidate(path.join(dataDir, 'concat', 'not', 'matching.js'));
        assert.isObject(cache.get(patterns));

        cache.invalidate(path.join(dataDir, 'concat', 'matching.js'));
        assert.isNull(cache.get(patterns));
      });
  });
});
