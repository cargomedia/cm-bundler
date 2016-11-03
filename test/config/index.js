var path = require('path');
var assert = require('chai').assert;
var Promise = require('bluebird');
var through = require('through2');

var BundleConfig = require('../../lib/config');
var helper = require('../../lib/util/helper');


var dataDir = path.join(__dirname, '..', '_data');
var baseDir = path.join(dataDir, 'base');
var libDir = path.join(dataDir, 'lib');
var lib2Dir = path.join(dataDir, 'lib2');
var concatDir = path.join(dataDir, 'concat');


describe('config', function() {

  it('instantiation', function() {
    var config = new BundleConfig({bundleName: 'foo'});
    var data = config.get();
    delete data.bundleName;
    var id = helper.hash(data);
    var key = helper.hash(id + helper.hash({}));

    assert.equal(config.name(), 'foo');
    assert.equal(config.id(), id);
    assert.equal(config.key(), key);
    assert.isObject(config.get());
  });

  it('get', function() {
    var config = new BundleConfig();
    var data = config.get();
    data.foo = 123;
    assert.notEqual(config.get(), data);
  });

  it('merge', function() {
    var config = new BundleConfig({
      bundleName: 'foo',
      sourceMaps: {
        replace: {
          'foo': 'bar'
        }
      },
      ignoreMissing: true,
      paths: ['foo'],
      content: [{source: 'foobar'}]
    }, '/custom/baseDir');

    assert.deepEqual(config.get(), {
        "baseDir": "/custom/baseDir",
        "bundleName": "foo",
        "sourceMaps": {
          "replace": {
            "foo": "bar",
            ".cm-bundler/require": "(^|.*/)browser-pack/_prelude.js",
            ".cm-bundler": "(^|.*/)cm-bundler",
            "": /\.js$/
          }
        },
        "ignoreMissing": true,
        "paths": ["foo"],
        "content": [{"source": "foobar"}],
        "uglify": false,
        "watch": [],
        "libraries": [],
        "entries": [],
        "concat": []
      }
    );
  });

  it('watch patterns', function() {
    var config = new BundleConfig({
      bundleName: 'foo',
      paths: [libDir, lib2Dir],
      entries: [
        path.join(baseDir, 'foo/file1.js'),
        path.join(baseDir, 'foo/file1.js'),
        path.join(baseDir, 'inexistent.js')
      ],
      libraries: [
        path.join(dataDir, 'lib2/baz/file1.js'),
        path.join(dataDir, 'lib2/baz/inexistent.js')
      ],
      watch: [
        path.join(concatDir, '*.js'),
        path.join(libDir, '**/*.js'),
        path.join(concatDir, 'inexistent/*.js')
      ]
    }, baseDir, ['js', 'ejs']);

    assert.deepEqual(config._getPatterns(), [
      path.join(libDir, '**/*.js'),
      path.join(lib2Dir, '**/*.js'),
      path.join(lib2Dir, '**/*.ejs'),
      path.join(lib2Dir, 'baz/file1.js'),
      path.join(baseDir, 'foo/file1.js'),
      path.join(concatDir, '*.js')
    ]);

    var config = new BundleConfig({
      bundleName: 'foo',
      paths: [libDir, lib2Dir]
    }, baseDir, ['ejs']);

    assert.deepEqual(config._getPatterns(), [
      path.join(lib2Dir, '**/*.ejs')
    ]);
  });

  it('process', function() {
    var config = new BundleConfig({
      content: [{path: 'foo', source: '//foo'}]
    });

    return Promise
      .try(function() {
        return helper.streamPromise(config.process());
      })
      .timeout(100)
      .then(function(file) {
        var result = file.contents.toString('utf-8');
        assert.match(result, /\/\/foo/);
        assert.match(result, /require/);
      });
  });

  it('process failed', function(done) {
    var config = new BundleConfig({
      content: [{path: 'foo', source: 'require("not/defined")'}]
    });

    config
      .process()
      .on('error', function(error) {
        assert.match(error, /Cannot find module 'not\/defined' from/);
        done();
      })
      .on('finish', function() {
        assert.fail(0, 1, 'process stream should have triggered an error');
        done();
      });
  });

  it('process failed / timeout', function(done) {
    var config = new BundleConfig({}, null, null, 5);

    config._process = function() {
      return through.obj();
    };

    config
      .process()
      .on('error', function(error) {
        assert.match(error, /Timeout: failed to create the bundle after/);
        done();
      })
      .on('finish', function() {
        assert.fail(0, 1, 'process stream should have triggered a timeout error');
        done();
      });
  });

  it('process concurrent', function() {
    var config = new BundleConfig({
      concat: [path.join(dataDir, 'concat', '*.js')]
    });

    var processFinish1 = false;
    var processFinish2 = false;

    var _process = config._process;
    config._process = function() {
      if (processFinish1) {
        assert.notOk(processFinish2);
      }
      if (processFinish2) {
        assert.ok(processFinish1);
      }
      return _process.apply(config, arguments);
    };

    return Promise.join(
      helper.streamPromise(
        config.process()
          .on('data', function() {
            assert.isNull(config._cache.key);
          })
          .on('finish', function() {
            processFinish1 = true;
          })
      ),
      helper.streamPromise(
        config.process()
          .on('data', function() {
            assert.equal(config._cache.key, config.key());
          })
          .on('finish', function() {
            processFinish2 = true;
          })
      ),
      function(file1, file2) {
        assert.ok(processFinish1);
        assert.ok(processFinish2);
        assert.ok(file1.contents.length > 0);
        assert.deepEqual(file1, file2);
      }
    );
  });
});
