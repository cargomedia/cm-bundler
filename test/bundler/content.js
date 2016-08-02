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

describe('bundler: add content', function() {

  it('wrong content', function() {
    var b = browserify();

    assert.throws(function() {
      bundler.addContent(b, [
        {}
      ]);
    }, /content.name property required./);

    assert.throws(function() {
      bundler.addContent(b, [
        {name: 'foo'}
      ]);
    }, /content.data property required./);
  });

  it('minimal', function(done) {
    var b = browserify();
    bundler.addContent(b, [
      {name: 'foo', data: 'moduleLoaded("foo");'}
    ]);

    b.bundle(function(error, src) {
      var context = executeInVM(src);
      var str = src.toString('utf-8');

      assert.ifError(error);
      assert.ok(src.length > 0);
      assert.match(str, /moduleLoaded/);
      assert.equal(context.getCountLoaded('foo'), 1);
      assert.isUndefined(context.require);
      done();
    });
  });

  it('require option', function(done) {
    var b = browserify();
    bundler.addContent(b, [
      {name: 'foo', data: 'moduleLoaded("foo"); module.exports=function(){moduleExecuted("foo");};', require: true}
    ]);

    b.bundle(function(error, src) {
      var context = executeInVM(src);
      assert.ifError(error);
      assert.ok(src.length > 0);
      assert.equal(context.getCountLoaded('foo'), 0);
      assert.typeOf(context.require, 'function');
      context.require('foo')();
      assert.equal(context.getCountLoaded('foo'), 1);
      assert.equal(context.getCountExecuted('foo'), 1);
      done();
    });
  });


  it('with dependencies', function(done) {
    var b = browserify({
      baseDir: baseDir,
      paths: [libDir]
    });
    bundler.addContent(b, [
      {name: 'foo', data: 'moduleLoaded("foo"); module.exports=require("bar/file1");'}
    ]);

    b.bundle(function(error, src) {
      var context = executeInVM(src);
      assert.ifError(error);
      assert.ok(src.length > 0);
      assert.isUndefined(context.require);
      assert.equal(context.getCountLoaded('foo'), 1);
      assert.equal(context.getCountLoaded('bar/file1'), 1);
      assert.equal(context.getCountExecuted('bar/file1'), 0);
      done();
    });
  });

  it('mapPath option', function(done) {
    var b = browserify({debug: true});
    bundler.addContent(b, [
      {name: 'foo', mapPath: 'bar/foo', data: '//foobar;'}
    ]);

    b.bundle(function(error, src) {
      var str = src.toString('utf-8');
      var map = convert.fromSource(str);

      assert.ifError(error);
      assert.ok(src.length > 0);
      assert.include(map.sourcemap.sources, 'bar/foo');
      done();
    });
  });

  it('mixed', function(done) {
    var b = browserify({debug: true});
    bundler.addContent(b, [
      {name: 'foo1', data: 'moduleLoaded("foo1");'},
      {name: 'foo2', data: 'moduleLoaded("foo2"); module.exports=function(){moduleExecuted("foo2");};', require: true},
      {name: 'foo3', mapPath: 'bar/foo', data: 'moduleLoaded("foo3"); module.exports="foo3";'}
    ]);

    b.bundle(function(error, src) {
      var str = src.toString('utf-8');
      var map = convert.fromSource(str);
      var context = executeInVM(src);

      assert.ok(src.length > 0);
      assert.ifError(error);
      ['foo1', 'foo2', 'bar/foo'].forEach(function(name) {
        assert.include(map.sourcemap.sources, name);
      });
      assert.typeOf(context.require, 'function');
      assert.equal(context.getCountLoaded('foo1'), 1);
      assert.equal(context.getCountLoaded('foo2'), 0);
      assert.equal(context.getCountLoaded('foo3'), 1);
      assert.equal(context.getCountExecuted('foo2'), 0);

      assert.throws(function() {
        context.require('foo1');
      }, /Cannot find module 'foo1'/);
      assert.throws(function() {
        context.require('foo3');
      }, /Cannot find module 'foo3'/);

      context.require('foo2')();

      assert.equal(context.getCountLoaded('foo2'), 1);
      assert.equal(context.getCountExecuted('foo2'), 1);

      done();
    });
  });
});
