var vm = require('vm');
var path = require('path');
var assert = require('chai').assert;
var deap = require('deap');
var _ = require('underscore');
var Promise = require('bluebird');
var through = require('through2');
var browserify = require('browserify');

var dataDir = path.join(__dirname, '..', '_data');
var baseDir = path.join(dataDir, 'base');

var cache = require('../../lib/bundler/extra/cache');

describe('bundler: cache', function() {

  it('caching', function() {
    cache.clear();

    return Promise
      .try(function() {
        var config = deap({
          basedir: baseDir
        }, cache.prepare());

        var b = browserify(config);
        b.add('foo/file2.js');
        cache.process(b);

        return bundlePromise(b);
      })
      .then(function() {
        assert.deepEqual(Object.keys(cache._cache), [
          path.join(baseDir, 'foo/file1.js'),
          path.join(baseDir, 'foo/file2.js')
        ]);
      })
      .then(function() {
        var config = deap({
          basedir: baseDir
        }, cache.prepare());

        assert.deepEqual(Object.keys(config.cache), [
          path.join(baseDir, 'foo/file1.js'),
          path.join(baseDir, 'foo/file2.js')
        ]);

        _.each(config.cache, function(entry) {
          entry.source += '//from cache';
        });

        var b = browserify(config);
        b.add('foo/file2.js');
        cache.process(b);

        b.pipeline.get('deps').push(through.obj(function(row, enc, next) {
          assert.match(row.source, /\/\/from cache$/);
          this.push(row);
          next();
        }));

        return bundlePromise(b);
      })
      .then(function() {
        assert.deepEqual(Object.keys(cache._cache), [
          path.join(baseDir, 'foo/file1.js'),
          path.join(baseDir, 'foo/file2.js')
        ]);
      })
  });

  it('invalidate', function() {
    cache.clear();

    return Promise
      .try(function() {
        var config = deap({
          basedir: baseDir
        }, cache.prepare());

        var b = browserify(config);
        b.add('foo/file2.js');
        cache.process(b);

        return bundlePromise(b);
      })
      .then(function() {
        assert.deepEqual(Object.keys(cache._cache), [
          path.join(baseDir, 'foo/file1.js'),
          path.join(baseDir, 'foo/file2.js')
        ]);
      })
      .then(function() {

        cache.invalidate(path.join(baseDir, 'foo/file2.js'));

        var config = deap({
          basedir: baseDir
        }, cache.prepare());

        assert.deepEqual(Object.keys(config.cache), [
          path.join(baseDir, 'foo/file1.js')
        ]);

        _.each(config.cache, function(entry) {
          entry.source += '//from cache';
        });

        var b = browserify(config);
        b.add('foo/file2.js');
        cache.process(b);

        b.pipeline.get('deps').push(through.obj(function(row, enc, next) {
          if (row.file == path.join(baseDir, 'foo/file2.js')) {
            assert.notMatch(row.source, /\/\/from cache$/);
          } else {
            assert.match(row.source, /\/\/from cache$/);
          }
          this.push(row);
          next();
        }));

        return bundlePromise(b);
      })
      .then(function() {
        assert.deepEqual(Object.keys(cache._cache), [
          path.join(baseDir, 'foo/file1.js'),
          path.join(baseDir, 'foo/file2.js')
        ]);
      });
  });
});


function bundlePromise(browserify) {
  return new Promise(function(resolve, reject) {
    browserify.bundle(function(error, src) {
      error && reject(error) || resolve(src);
    });
  });
}

