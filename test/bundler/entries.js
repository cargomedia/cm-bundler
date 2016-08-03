var vm = require('vm');
var assert = require('chai').assert;
var browserify = require('browserify');
var convert = require('convert-source-map');
var bundler = require('../../lib/bundler');
var path = require('path');

var dataDir = path.join(__dirname, '..', '_data');
var baseDir = path.join(dataDir, 'base');
var libDir = path.join(dataDir, 'lib');

var executeInVM = function(src) {
  var context = {
    console: console,
    execCount: {},
    loadCount: {},
    moduleLoaded: function(name) {
      context.loadCount[name] = name in context.loadCount ? context.loadCount[name]++ : 1;
    },
    getCountLoaded: function(name) {
      return name in context.loadCount ? context.loadCount[name] : 0;
    },
    moduleExecuted: function(name) {
      context.execCount[name] = name in context.execCount ? context.execCount[name]++ : 1;
    },
    getCountExecuted: function(name) {
      return name in context.execCount ? context.execCount[name] : 0;
    }
  };
  vm.runInNewContext(src, context);
  return context;
};


describe('bundler: add entries', function() {

  it('module not found', function(done) {
    var b = browserify({
      basedir: baseDir
    });

    bundler.addEntries(b, [
      'wrong/file1.js'
    ]);

    b.bundle(function(error, src) {
      assert.instanceOf(error, Error);
      assert.match(error.toString(), /Cannot find module/);
      done();
    });
  });

  it('no dependencies', function(done) {
    var b = browserify({
      basedir: baseDir
    });

    bundler.addEntries(b, [
      'foo/file1.js'
    ]);

    b.bundle(function(error, src) {
      assert.ifError(error);
      assert.isObject(src);
      assert.ok(src.length > 0);

      var context = executeInVM(src);
      assert.isUndefined(context.require);
      assert.equal(context.getCountLoaded('foo/file1'), 1);
      assert.equal(context.getCountExecuted('foo/file1'), 0);
      done();
    });
  });

  it('with local dependencies', function(done) {
    var b = browserify({
      basedir: baseDir
    });

    bundler.addEntries(b, [
      'foo/file2.js'
    ]);

    b.bundle(function(error, src) {
      assert.ifError(error);
      assert.isObject(src);
      assert.ok(src.length > 0);

      var context = executeInVM(src);
      assert.isUndefined(context.require);
      assert.equal(context.getCountLoaded('foo/file2'), 1);
      assert.equal(context.getCountExecuted('foo/file2'), 0);
      assert.equal(context.getCountLoaded('foo/file1'), 1);
      assert.equal(context.getCountExecuted('foo/file1'), 0);
      done();
    });
  });


  it('with external dependencies', function(done) {
    var b = browserify({
      basedir: baseDir,
      paths: [libDir]
    });

    bundler.addEntries(b, [
      'foo/file3.js'
    ]);

    b.bundle(function(error, src) {
      assert.ifError(error);
      assert.isObject(src);
      assert.ok(src.length > 0);

      var context = executeInVM(src);
      assert.isUndefined(context.require);
      assert.equal(context.getCountLoaded('foo/file3'), 1);
      assert.equal(context.getCountExecuted('foo/file3'), 0);
      assert.equal(context.getCountLoaded('bar/file1'), 1);
      assert.equal(context.getCountExecuted('bar/file1'), 0);
      done();
    });
  });
});

