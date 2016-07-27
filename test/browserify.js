var vm = require('vm');
var assert = require('chai').assert;
var browserify = require('browserify');
var convert = require('convert-source-map');
var bundler = require('../lib/bundler');
var path = require('path');

var dataDir = path.join(__dirname, 'data');
var baseDir = path.join(dataDir, 'base');
var libDir = path.join(dataDir, 'lib');
var lib2Dir = path.join(dataDir, 'lib2');

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


describe('browserify', function() {

  it('full', function(done) {
    bundler
      .browserify({
        "entries": [
          "foo/file2.js",
          "foo/file3.js"
        ],
        "libraries": [
          "baz/file1"
        ],
        "content": [
          {
            "name": "foo",
            "data": "moduleLoaded('foo'); module.exports=function(){moduleExecuted('foo');};"
          },
          {
            "name": "bar",
            "require": true,
            "mapPath": "custom/bar",
            "data": "moduleLoaded('bar'); module.exports=require('baz/file2');"
          }
        ],
        "paths": [
          libDir,
          lib2Dir
        ],
        "sourceMaps": true,
        "baseDir": baseDir
      }, function(error, src) {
        assert.ifError(error);
        assert.isObject(src);
        assert.ok(src.length > 0);
        var str = src.toString('utf-8');
        var map = convert.fromSource(str);

        [
          '_prelude',
          'foo/file1.js',
          'foo/file2.js',
          'foo/file3.js',
          'bar/file1.js',
          'baz/file1',
          'baz/file2',
          'foo',
          'custom/bar'
        ].forEach(function(name) {
          var valid = false;
          var index = 0;
          do {
            valid = (new RegExp(name)).test(map.sourcemap.sources[index]);
          } while (!valid && ++index < map.sourcemap.sources.length);

          assert.ok(valid, '`' + name + '` exists in the source maps.');
        });

        var context = executeInVM(src);
        assert.typeOf(context.require, 'function');
        // entries
        assert.equal(context.getCountLoaded('foo/file1'), 1);
        assert.equal(context.getCountLoaded('foo/file2'), 1);
        assert.equal(context.getCountLoaded('foo/file3'), 1);
        // lib + entry dep
        assert.equal(context.getCountLoaded('bar/file1'), 1);
        // content
        assert.equal(context.getCountLoaded('foo'), 1);
        assert.equal(context.getCountLoaded('bar'), 0);
        assert.equal(context.getCountLoaded('baz/file2'), 0);
        // lib only
        assert.equal(context.getCountLoaded('baz/file1'), 0);


        // entries
        assert.equal(context.getCountExecuted('foo/file1'), 0);
        assert.equal(context.getCountExecuted('foo/file2'), 0);
        assert.equal(context.getCountExecuted('foo/file3'), 0);
        // lib + entry dep
        assert.equal(context.getCountExecuted('bar/file1'), 0);
        // content
        assert.equal(context.getCountExecuted('foo'), 0);
        assert.equal(context.getCountExecuted('baz/file2'), 0);
        // lib only
        assert.equal(context.getCountExecuted('baz/file1'), 0);


        ['baz/file1', 'bar'].forEach(function(exposedModule) {
          var module = context.require(exposedModule);
          module();
        });

        ['bar/file1', 'foo/file1.js', 'foo/file2.js', 'foo/file3.js', 'baz/file2', 'foo'].forEach(function(notExposedModule) {
          assert.throws(function() {
            context.require(notExposedModule);
          }, /Cannot find module/);
        });

        // entries
        assert.equal(context.getCountExecuted('foo/file1'), 0);
        assert.equal(context.getCountExecuted('foo/file2'), 0);
        assert.equal(context.getCountExecuted('foo/file3'), 0);
        // lib + entry dep
        assert.equal(context.getCountExecuted('bar/file1'), 0);
        // content
        assert.equal(context.getCountExecuted('foo'), 0);
        assert.equal(context.getCountExecuted('baz/file2'), 1);
        // lib only
        assert.equal(context.getCountExecuted('baz/file1'), 1);

        done();
      });
  });
});

