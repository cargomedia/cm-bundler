var vm = require('vm');
var path = require('path');
var deap = require('deap');
var assert = require('chai').assert;
var Promise = require('bluebird');
var convert = require('convert-source-map');
var helper = require('../../lib/util/helper');

var dataDir = path.join(__dirname, '..', '_data');
var baseDir = path.join(dataDir, 'base');
var libDir = path.join(dataDir, 'lib');
var lib2Dir = path.join(dataDir, 'lib2');

var BundlerConfig = require('../../lib/bundler/config');
var bundler = require('../../lib/bundler');


describe('bundler: process', function() {

  it('all', function() {
    return Promise
      .try(function() {
        var config = new BundlerConfig({
          "entries": [
            "foo/file2.js",
            "foo/file3.js",
            "foo/requireFoobar.js"
          ],
          "libraries": [
            "baz/file1"
          ],
          "concat": [
            "../concat/**/*.js"
          ],
          "content": [
            {
              "path": "foo",
              "source": "moduleLoaded('foo'); module.exports=function(){moduleCalled('foo');};"
            },
            {
              "path": "bar",
              "source": "moduleLoaded('bar'); module.exports=require('baz/file2');",
              "execute": false,
              "expose": true
            },
            {
              "path": "foobar",
              "source": "moduleLoaded('foobar'); module.exports=function(){moduleCalled('foobar');};",
              "execute": false
            }
          ],
          "paths": [
            libDir,
            lib2Dir
          ],
          "baseDir": baseDir
        });

        return helper.streamPromise(bundler.process(config));
      })
      .then(function(result) {

        var src = result.contents;

        assert.instanceOf(src, Buffer);
        assert.ok(src.length > 0);
        var str = src.toString('utf-8');

        var map = result.sourceMap;

        [
          '_001/001',
          '_001/010',
          '_010',
          '001',
          '010',
          'sub/001',
          'sub/010',
          'require',
          'foo/file1',
          'foo/file2',
          'foo/file3',
          'foo/requireFoobar',
          'bar/file1',
          'baz/file1',
          'baz/file2',
          'foo',
          'bar',
          'foobar'
        ].forEach(function(name) {
          assert.ok(
            map.sources.filter(function(source) {
              return (new RegExp(name)).test(source);
            }).length > 0,
            '`' + name + '` exists in the source maps.'
          );
        });

        assert.match(map.sourcesContent[9], /foo\/file1/);
        assert.match(map.sourcesContent[9], /exports = function/);

        var context = executeInVM(src);
        assert.typeOf(context.require, 'function');
        // entries
        assert.equal(context.getCountLoaded('foo/file1'), 1);
        assert.equal(context.getCountLoaded('foo/file2'), 1);
        assert.equal(context.getCountLoaded('foo/file3'), 1);
        assert.equal(context.getCountLoaded('requireFoobar'), 1);
        // lib + entry dep
        assert.equal(context.getCountLoaded('bar/file1'), 1);
        // content
        assert.equal(context.getCountLoaded('foo'), 1);
        assert.equal(context.getCountLoaded('bar'), 0);
        assert.equal(context.getCountLoaded('foobar'), 1);
        // lib only
        assert.equal(context.getCountLoaded('baz/file1'), 0);
        assert.equal(context.getCountLoaded('baz/file2'), 0);


        // entries
        assert.equal(context.getCountCalled('foo/file1'), 0);
        // lib + entry dep
        assert.equal(context.getCountCalled('bar/file1'), 0);
        // content
        assert.equal(context.getCountCalled('foo'), 0);
        assert.equal(context.getCountCalled('foobar'), 1);
        // lib only
        assert.equal(context.getCountCalled('baz/file1'), 0);
        assert.equal(context.getCountCalled('baz/file2'), 0);


        ['baz/file1', 'bar'].forEach(function(exposedModule) {
          var module = context.require(exposedModule);
          module();
        });

        ['bar/file1', 'foo/file1.js', 'foo/file2.js', 'foo/file3.js', 'baz/file2', 'foo', 'foobar'].forEach(function(notExposedModule) {
          assert.throws(function() {
            context.require(notExposedModule);
          }, /Cannot find module/);
        });

        // entries
        assert.equal(context.getCountCalled('foo/file1'), 0);
        // lib + entry dep
        assert.equal(context.getCountCalled('bar/file1'), 0);
        // content
        assert.equal(context.getCountCalled('foo'), 0);
        // lib only
        assert.equal(context.getCountCalled('baz/file1'), 1);
        assert.equal(context.getCountCalled('baz/file2'), 1);
      });
  });
});


function executeInVM(src, context) {
  context = deap({
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
  }, context || {});
  vm.runInNewContext(src, context);
  return context;
}
