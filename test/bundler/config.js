var path = require('path');
var assert = require('chai').assert;
var EventEmitter = require('events').EventEmitter;
var Promise = require('bluebird');
var through = require('through2');

var bundler = require('../../lib/bundler');
var BundleConfig = require('../../lib/bundler/config');
var helper = require('../../lib/util/helper');


var dataDir = path.join(__dirname, '..', '_data');
var baseDir = path.join(dataDir, 'base');
var libDir = path.join(dataDir, 'lib');
var lib2Dir = path.join(dataDir, 'lib2');
var concatDir = path.join(dataDir, 'concat');


describe('bundler: BundlerConfig', function() {

  it('instantiation', function() {
    bundler.clearCache();

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
        "watch": [],
        "libraries": [],
        "entries": [],
        "concat": []
      }
    );
  });

  it('watch patterns', function() {
    bundler.clearCache();
    var config = new BundleConfig({
      bundleName: 'foo',
      watch: [
        path.join(concatDir, '*.js'),
        path.join(libDir, '**/*.js'),
        path.join(concatDir, 'inexistent/*.js')
      ]
    }, baseDir);

    assert.deepEqual(config._getPatterns(), [
      path.join(concatDir, '*.js'),
      path.join(libDir, '**/*.js')
    ]);
  });

  it('process', function() {
    bundler.clearCache();
    var config = new BundleConfig({
      content: [{path: 'foo', source: 'var foo=100;'}]
    });

    return Promise
      .try(function() {
        return helper.streamPromise(config.process());
      })
      .timeout(100)
      .then(function(file) {
        var result = file.contents.toString('utf-8');
        assert.match(result, /foo=100/);
        assert.match(result, /require/);
      });
  });

  it('process failed', function(done) {
    bundler.clearCache();
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
    bundler.clearCache();
    var config = new BundleConfig({}, null, 5);

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

  it('process concurrency', function() {
    bundler.clearCache();
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

  it('process renew', function(done) {
    bundler.clearCache();
    var config = new BundleConfig({
      concat: [path.join(dataDir, 'concat', '*.js')]
    }, dataDir, null, 10);

    config.initialize();

    var processCount = 0;
    var invalidates = [];

    var emitter = new EventEmitter();
    var process = config.process;
    config.process = function() {
      processCount++;
      var processStream = process.apply(config, arguments);
      emitter.emit('stream', processStream);
      return processStream;
    };
    var _invalidate = config._invalidate;
    config._invalidate = function(file) {
      invalidates.push(file);
      return _invalidate.apply(config, arguments);
    };


    emitter.on('stream', function(stream) {
      assert.equal(processCount, 1);
      stream.on('finish', function() {
        assert.deepEqual(invalidates, [
          path.join(dataDir, 'foo1.js'),
          path.join(dataDir, 'foo2.js'),
          path.join(dataDir, 'foo3.js')
        ]);
        done();
      });
    });

    config._renew('change', 'foo1.js');
    config._renew('change', 'foo2.js');
    config._renew('change', 'foo3.js');
  });

  it('process renew / delayed', function(done) {
    bundler.clearCache();
    var config = new BundleConfig({
      concat: [path.join(dataDir, 'concat', '*.js')]
    }, dataDir, null, 10);

    config.initialize();

    var processCount = 0;
    var invalidates = [];

    var emitter = new EventEmitter();
    var process = config.process;
    config.process = function() {
      processCount++;
      var processStream = process.apply(config, arguments);
      emitter.emit('stream', processStream);
      return processStream;
    };
    var _invalidate = config._invalidate;
    config._invalidate = function(file) {
      invalidates.push(file);
      return _invalidate.apply(config, arguments);
    };


    emitter.on('stream', function(stream) {
      if (processCount == 1) {
        stream.on('finish', function() {
          assert.deepEqual(invalidates, [
            path.join(dataDir, 'foo1.js'),
            path.join(dataDir, 'foo2.js')
          ]);
        });
      }
      if (processCount == 2) {
        stream.on('finish', function() {
          assert.deepEqual(invalidates, [
            path.join(dataDir, 'foo1.js'),
            path.join(dataDir, 'foo2.js'),
            path.join(dataDir, 'foo3.js')
          ]);
        });
        done();
      }
    });

    config._renew('change', 'foo1.js');
    config._renew('change', 'foo2.js');
    setTimeout(function() {
      config._renew('change', 'foo3.js');
    }, 30);
  });
});
