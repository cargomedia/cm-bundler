var vm = require('vm');
var assert = require('chai').assert;
var browserify = require('browserify');
var convert = require('convert-source-map');
var path = require('path');

var dataDir = path.join(__dirname, '../_data');
var libDir = path.join(dataDir, 'lib');
var tsDir = path.join(dataDir, 'typescript');

var bundler = require('../../lib/bundler');

var executeInVM = function(src) {
  var context = {
    data: [],
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
    },
    addData: function(data) {
      context.data.push(data);
    },
    getData: function() {
      return context.data;
    }
  };
  vm.runInNewContext(src, context);
  return context;
};


describe('bundler: typescript', function() {

  it('full', function(done) {

    bundler.browserify({
      "entries": [
        "main.ts"
      ],
      "libraries": [
        tsDir + "/lib/baz.ts"
      ],
      "paths": [
        libDir
      ],
      "sourceMaps": {
        "enabled": true
      },
      "baseDir": tsDir
    }).bundle(function(error, src) {
      if (error) {
        console.error(error);
        console.error(error.stack);
      }
      assert.ifError(error);
      assert.isObject(src);
      assert.ok(src.length > 0);
      var str = src.toString('utf-8');
      var map = convert.fromSource(str);

      [
        '_prelude',
        'main.ts',
        'lib/foo.ts',
        'lib/bar.ts',
        'bar/file1.js'
      ].forEach(function(name) {
        var valid = false;
        var index = 0;
        do {
          valid = (new RegExp(name)).test(map.sourcemap.sources[index]);
        } while (!valid && ++index < map.sourcemap.sources.length);

        assert.ok(valid, '`' + name + '` exists in the source maps.');
      });

      var context = executeInVM(src);

      assert.equal(context.getCountLoaded('main.ts'), 1);
      assert.equal(context.getCountLoaded('foo.ts'), 1);
      assert.equal(context.getCountLoaded('bar.ts'), 1);
      assert.equal(context.getCountLoaded('bar/file1'), 1);
      assert.equal(context.getCountExecuted('bar/file1'), 1);
      assert.equal(context.getData().length, 1);
      assert.equal(context.getData()[0], 'foo:hello bar:HELLO');

      assert.typeOf(context.require, 'function');
      assert.equal(context.getCountLoaded('baz.ts'), 0);
      assert.equal(context.getCountExecuted('baz.ts'), 0);

      var module = context.require(tsDir + '/lib/baz.ts');

      assert.equal(context.getCountLoaded('baz.ts'), 1);
      assert.equal(context.getCountExecuted('baz.ts'), 0);

      assert.equal(module.baz('hello'), 'HELLO');
      assert.equal(context.getCountLoaded('baz.ts'), 1);
      assert.equal(context.getCountExecuted('baz.ts'), 1);

      done();
    });
  });
});

