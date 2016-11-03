var vm = require('vm');
var path = require('path');
var assert = require('chai').assert;
var deap = require('deap');
var browserify = require('browserify');
var convert = require('convert-source-map');

var dataDir = path.join(__dirname, '..', '_data');
var baseDir = path.join(dataDir, 'base');
var libDir = path.join(dataDir, 'lib');

var entries = require('../../lib/bundler/extra/entries');

var executeInVM = function(src) {
  var context = {
    console: console,
    callCount: {},
    loadCount: {},
    moduleLoaded: function(name) {
      context.loadCount[name] = context.getCountLoaded(name) + 1;
    },
    getCountLoaded: function(name) {
      return name in context.loadCount ? context.loadCount[name] : 0;
    },
    moduleCalled: function(name) {
      context.callCount[name] = context.getCountCalled(name) + 1;
    },
    getCountCalled: function(name) {
      return name in context.callCount ? context.callCount[name] : 0;
    }
  };
  vm.runInNewContext(src, context);
  return context;
};


describe('bundler: add entries', function() {

  it('module not found', function(done) {
    var options = deap(
      {debug: true},
      entries.prepare([
        'wrong/file1.js'
      ])
    );

    entries
      .process(browserify(options))
      .bundle(function(error, src) {
      assert.instanceOf(error, Error);
      assert.match(error.toString(), /Cannot find module/);
      done();
    });
  });

  it('no dependencies', function(done) {
    var options = deap(
      {
        basedir: baseDir
      },
      entries.prepare([
        'foo/file1.js'
      ])
    );

    entries
      .process(browserify(options))
      .bundle(function(error, src) {
        assert.ifError(error);
      assert.isObject(src);
      assert.ok(src.length > 0);

      var context = executeInVM(src);
      assert.isUndefined(context.require);
      assert.equal(context.getCountLoaded('foo/file1'), 1);
        assert.equal(context.getCountCalled('foo/file1'), 0);
      done();
    });
  });

  it('with local dependencies', function(done) {
    var options = deap(
      {
        basedir: baseDir
      },
      entries.prepare([
        'foo/file2.js'
      ])
    );

    entries
      .process(browserify(options))
      .bundle(function(error, src) {
        assert.ifError(error);
      assert.isObject(src);
      assert.ok(src.length > 0);

      var context = executeInVM(src);
      assert.isUndefined(context.require);
      assert.equal(context.getCountLoaded('foo/file2'), 1);
        assert.equal(context.getCountCalled('foo/file2'), 0);
      assert.equal(context.getCountLoaded('foo/file1'), 1);
        assert.equal(context.getCountCalled('foo/file1'), 0);
      done();
    });
  });


  it('with external dependencies', function(done) {
    var options = deap(
      {
        basedir: baseDir,
        paths: [libDir]
      },
      entries.prepare([
        'foo/file3.js'
      ])
    );

    entries
      .process(browserify(options))
      .bundle(function(error, src) {
        assert.ifError(error);
      assert.isObject(src);
      assert.ok(src.length > 0);

      var context = executeInVM(src);
      assert.isUndefined(context.require);
      assert.equal(context.getCountLoaded('foo/file3'), 1);
        assert.equal(context.getCountCalled('foo/file3'), 0);
      assert.equal(context.getCountLoaded('bar/file1'), 1);
        assert.equal(context.getCountCalled('bar/file1'), 0);
      done();
    });
  });
});

