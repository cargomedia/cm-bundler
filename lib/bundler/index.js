var _ = require('underscore');
var deap = require('deap');
var browserify = require('browserify');
var pipeline = require('pumpify').obj;

var stream = require('../stream');
var plugins = require('./plugins');
var transforms = require('./transforms');

module.exports = {

  /**
   * @params {BundlerConfig} bundlerConfig
   * @returns {Stream}
   */
  process: function(bundlerConfig) {
    var config = bundlerConfig.get();
    var step = new Date();
    var start = new Date();

    return pipeline(
      this._browerify(config),
      stream.debug('browerify %sms', step),
      this._map(config),
      stream.debug('map       %sms', step),
      this._concat(config),
      stream.debug('merge     %sms', step),
      this._remap(config),
      stream.debug('remap     %sms', step),
      stream.debug('total     %sms', start)
    );
  },

  /**
   * @param {BundlerConfig~config} config
   * @returns {Browserify}
   */
  browserify: function(config) {
    var b = browserify({
      basedir: config.baseDir,
      paths: [config.baseDir].concat(config.paths),
      ignoreMissing: config.ignoreMissing,
      debug: true
    });

    b.plugin(plugins.cache);
    b.plugin(plugins.content, {
      contents: config.content
    });
    b.transform(transforms.uglify);

    config.entries.forEach(function(entry) {
      b.add(entry);
    });
    config.libraries.forEach(function(library) {
      b.require(library);
    });

    return b;
  },

  invalidate: function(filePath) {
    plugins.cache.invalidate(filePath);
    stream.concat.invalidate(filePath);
  },

  clearCache: function() {
    plugins.cache.clear();
    stream.concat.clear();
  },

  /**
   * @param {BundlerConfig~config} config
   * @returns {Transform}
   * @private
   */
  _browerify: function(config) {
    return pipeline(
      this.browserify(config).bundle(),
      stream.vinyl('.cm-bundler/require'),
      stream.buffer()
    );
  },

  /**
   * @param {BundlerConfig~config} config
   * @returns {Transform}
   * @private
   */
  _map: function(config) {
    return stream.sourcemaps.init({
      loadMaps: true
    });
  },

  /**
   * @param {BundlerConfig~config} config
   * @returns {Transform}
   * @private
   */
  _concat: function(config) {
    return stream.condition(config.concat.length > 0, function() {
      return stream.concat(config.concat, config.baseDir);
    });
  },

  /**
   * @param {BundlerConfig~config} config
   * @returns {Transform}
   * @private
   */
  _remap: function(config) {
    return stream.remap(
      config.sourceMaps.replace
    );
  }
};
