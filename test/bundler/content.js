var vm = require('vm');
var path = require('path');
var assert = require('chai').assert;
var deap = require('deap');
var browserify = require('browserify');
var convert = require('convert-source-map');

var dataDir = path.join(__dirname, '../_data');
var baseDir = path.join(dataDir, 'base');
var libDir = path.join(dataDir, 'lib');

var content = require('../../lib/bundler/extra/content');

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

describe('bundler: add content', function() {

  it('wrong content', function() {
    assert.throws(function() {
      content.prepare([{}]);
    }, /content.path property required./);

    assert.throws(function() {
      content.prepare([{path: 'foo'}]);
    }, /content.source property required./);
  });

  it('minimal', function(done) {
    var options = deap(
      {},
      content.prepare([
        {path: 'foo', source: 'moduleLoaded("foo");'}
      ])
    );

    content
      .process(browserify(options))
      .bundle(function(error, src) {
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

  it('exposed / not executed', function(done) {
    var options = deap(
      {},
      content.prepare([
        {path: 'foo', source: 'moduleLoaded("foo"); module.exports=function(){moduleCalled("foo");};', execute: false, expose: true}
      ])
    );

    content
      .process(browserify(options))
      .bundle(function(error, src) {
        var context = executeInVM(src);
        assert.ifError(error);
        assert.ok(src.length > 0);
        assert.equal(context.getCountLoaded('foo'), 0);
        assert.typeOf(context.require, 'function');

        var foo = context.require('foo');
        assert.equal(context.getCountLoaded('foo'), 1);
        assert.equal(context.getCountCalled('foo'), 0);

        foo();
        assert.equal(context.getCountCalled('foo'), 1);
        done();
      });
  });

  it('exposed / executed', function(done) {
    var options = deap(
      {},
      content.prepare([
        {path: 'foo', source: 'moduleLoaded("foo"); module.exports=function(){moduleCalled("foo");};', execute: true, expose: true}
      ])
    );

    content
      .process(browserify(options))
      .bundle(function(error, src) {
        var context = executeInVM(src);
        assert.ifError(error);
        assert.ok(src.length > 0);
        assert.equal(context.getCountLoaded('foo'), 1);
        assert.typeOf(context.require, 'function');

        var foo = context.require('foo');
        assert.equal(context.getCountLoaded('foo'), 1);
        assert.equal(context.getCountCalled('foo'), 0);

        foo();
        assert.equal(context.getCountCalled('foo'), 1);
        done();
      });
  });

  it('with dependencies', function(done) {
    var options = deap(
      {
        baseDir: baseDir,
        paths: [libDir]
      },
      content.prepare([
        {path: 'foo', source: 'moduleLoaded("foo"); require("bar/file1")();'}
      ])
    );

    content
      .process(browserify(options))
      .bundle(function(error, src) {
        var context = executeInVM(src);
        assert.ifError(error);
        assert.ok(src.length > 0);
        assert.isUndefined(context.require);
        assert.equal(context.getCountLoaded('foo'), 1);
        assert.equal(context.getCountLoaded('bar/file1'), 1);
        assert.equal(context.getCountCalled('bar/file1'), 1);
        done();
      });
  });

  it('as dependencies', function(done) {
    var options = deap(
      {
        basedir: baseDir,
        debug: true
      },
      content.prepare([
        {path: 'foobar', source: 'moduleLoaded("foobar"); module.exports=function() {moduleCalled("foobar")};'}
      ])
    );

    var b = browserify(options);
    b.add('foo/requireFoobar.js');

    content.process(b);
    b.bundle(function(error, src) {
      assert.ifError(error);
      var context = executeInVM(src);
      var str = src.toString('utf-8');
      var map = convert.fromSource(str);

      assert.ok(src.length > 0);
      assert.isUndefined(context.require);

      ['foo/requireFoobar.js', 'foobar'].forEach(function(name) {
        assert.ok(
          map.sourcemap.sources.filter(function(source) {
            return (new RegExp(name)).test(source);
          }).length > 0,
          '`' + name + '` exists in the source maps.'
        );
      });
      assert.equal(context.getCountLoaded('requireFoobar'), 1);
      assert.equal(context.getCountLoaded('foobar'), 1);
      assert.equal(context.getCountCalled('foobar'), 1);
      done();
    });
  });

  it('mixed', function(done) {
    var options = deap(
      {debug: true},
      content.prepare([
        {path: 'foo1', source: 'moduleLoaded("foo1");'},
        {path: 'foo2', source: 'moduleLoaded("foo2"); module.exports=function(){moduleCalled("foo2");};', execute: false, expose: true},
        {path: 'foo3', source: 'moduleLoaded("foo3"); module.exports=function(){require("foo2")();};', expose: true},
        {
          path: 'foo4',
          source: 'moduleLoaded("foo4"); var foo2 = require("foo2"); var foo3 = require("foo3"); module.exports={execFoo2:function(){foo2();},execFoo3:function(){foo3();}};',
          expose: true
        },
        {path: 'foo5', source: 'moduleLoaded("foo5");', execute: false, expose: true}
      ]));

    content
      .process(browserify(options))
      .bundle(function(error, src) {
        assert.ifError(error);
        var str = src.toString('utf-8');
        var map = convert.fromSource(str);
        var context = executeInVM(src);

        assert.ok(src.length > 0);

        ['foo1', 'foo2', 'foo3', 'foo4', 'foo5'].forEach(function(name) {
          assert.include(map.sourcemap.sources, name);
        });
        assert.typeOf(context.require, 'function');

        assert.equal(context.getCountLoaded('foo1'), 1);
        assert.equal(context.getCountLoaded('foo2'), 1);
        assert.equal(context.getCountLoaded('foo3'), 1);
        assert.equal(context.getCountLoaded('foo4'), 1);
        assert.equal(context.getCountLoaded('foo5'), 0);

        assert.throws(function() {
          context.require('foo1');
        }, /Cannot find module/);

        var foo2 = context.require('foo2');
        assert.equal(context.getCountLoaded('foo2'), 1);
        assert.equal(context.getCountCalled('foo2'), 0);

        foo2();
        assert.equal(context.getCountCalled('foo2'), 1);

        var foo3 = context.require('foo3');
        assert.equal(context.getCountLoaded('foo3'), 1);
        assert.equal(context.getCountLoaded('foo2'), 1);
        assert.equal(context.getCountCalled('foo2'), 1);

        foo3();
        assert.equal(context.getCountLoaded('foo3'), 1);
        assert.equal(context.getCountCalled('foo2'), 2);

        var foo4 = context.require('foo4');
        assert.equal(context.getCountLoaded('foo4'), 1);
        assert.equal(context.getCountLoaded('foo3'), 1);
        assert.equal(context.getCountLoaded('foo2'), 1);
        assert.equal(context.getCountCalled('foo2'), 2);

        foo4.execFoo2();
        assert.equal(context.getCountCalled('foo2'), 3);

        foo4.execFoo3();
        assert.equal(context.getCountCalled('foo2'), 4);

        context.require('foo5');
        assert.equal(context.getCountLoaded('foo5'), 1);

        done();
      });

  });
});
