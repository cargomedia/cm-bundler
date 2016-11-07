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

var cache = require('../../lib/bundler/plugins/cache');

describe('bundler: cache', function() {

  it('caching', function() {
    cache.clear();

    return Promise
      .try(function() {
        var b = browserify({
          basedir: baseDir
        });
        b.add('foo/file2.js');
        b.plugin(cache);

        return bundlePromise(b);
      })
      .then(function() {
        assert.deepEqual(cache.keys(), [
          path.join(baseDir, 'foo/file2.js'),
          path.join(baseDir, 'foo/file1.js')
        ]);
      })
      .then(function() {
        var b = browserify({
          basedir: baseDir
        });
        b.add('foo/file2.js');
        b.plugin(cache);

        assert.deepEqual(Object.keys(b._mdeps.cache), [
          path.join(baseDir, 'foo/file2.js'),
          path.join(baseDir, 'foo/file1.js')
        ]);

        _.each(b._mdeps.cache, function(entry) {
          entry.source += '//from cache';
        });

        b.pipeline.get('deps').push(through.obj(function(row, enc, next) {
          assert.match(row.source, /\/\/from cache$/);
          this.push(row);
          next();
        }));

        return bundlePromise(b);
      })
      .then(function() {
        assert.deepEqual(cache.keys(), [
          path.join(baseDir, 'foo/file2.js'),
          path.join(baseDir, 'foo/file1.js')
        ]);
      })
  });

  it('invalidate', function() {

    return Promise
      .try(function() {
        cache.clear();

        var b = browserify({
          basedir: baseDir
        });
        b.add('foo/file2.js');
        b.plugin(cache);

        return bundlePromise(b);
      })
      .then(function() {
        assert.deepEqual(cache.keys(), [
          path.join(baseDir, 'foo/file2.js'),
          path.join(baseDir, 'foo/file1.js')
        ]);
      })
      .then(function() {

        cache.invalidate(path.join(baseDir, 'foo/file2.js'));

        var b = browserify({
          basedir: baseDir
        });
        b.add('foo/file2.js');
        b.plugin(cache);

        assert.deepEqual(Object.keys(b._mdeps.cache), [
          path.join(baseDir, 'foo/file1.js')
        ]);

        _.each(b._mdeps.cache, function(entry) {
          entry.source += '//from cache';
        });

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
        assert.deepEqual(cache.keys(), [
          path.join(baseDir, 'foo/file2.js'),
          path.join(baseDir, 'foo/file1.js')
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

