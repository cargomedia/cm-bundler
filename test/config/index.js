var assert = require('chai').assert;
var deap = require('deap');
var config = require('../../lib/config');

describe('config', function() {

  it('getter', function() {
    config.reset();
    var defaultConfig = deap.clone(require('../../config'));
    assert.deepEqual(config.get(), defaultConfig);
    assert.deepEqual(config.get('bundler'), defaultConfig.bundler);
    assert.deepEqual(config.get('bundler.host'), defaultConfig.bundler.host);
    assert.deepEqual(config.get('bundler.host', 100), defaultConfig.bundler.host);
    assert.deepEqual(config.get('bundler.foo', 100), 100);

    // immutability
    var clone = config.get();
    assert.notEqual(config.get('bundler.host'), 'foo');
    clone.bundler.host = 'foo';
    assert.notEqual(config.get('bundler.host'), 'foo');
  });

  it('merge', function() {
    config.reset();
    config.merge({
      bundler: {
        host: 'foo',
        bar: 123
      }
    });
    var configBundler = deap.clone(require('../../config')).bundler;
    configBundler.host = 'foo';
    configBundler.bar = 123;
    assert.deepEqual(config.get('bundler'), configBundler);
  });

  it('require', function() {
    config.reset();

    assert.throws(function() {
      config.require('./_config');
    }, 'Failed to load config at ./_config');

    assert.throws(function() {
      config.require(require.resolve('./_invalidConfig'));
    }, /^Invalid config at .*_invalidConfig\.js$/);

    config.require(require.resolve('./_config'));

    var configBundler = deap.clone(require('../../config')).bundler;
    configBundler.host = 'foo';
    configBundler.bar = 123;
    assert.deepEqual(config.get('bundler'), configBundler);
  });
});
