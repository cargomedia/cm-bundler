var _ = require('underscore');
var deap = require('deap');
var browserify = require('browserify');
var pipeline = require('pumpify').obj;

var stream = require('../stream');
var extra = require('./extra');


module.exports = {

  /**
   * @params {BundlerConfig} bundlerConfig
   * @returns {Stream}
   */
  process: function(bundlerConfig) {
    var config = bundlerConfig.get();
    return pipeline(
      this._browerify(config),
      this._map(config),
      this._concat(config),
      this._uglify(config),
      this._remap(config)
    );
  },

  /**
   * @param {BundlerConfig~config} config
   * @returns {Browserify}
   */
  browserify: function(config) {
    var options = deap(
      {
        basedir: config.baseDir,
        paths: [config.baseDir].concat(config.paths),
        ignoreMissing: config.ignoreMissing,
        debug: true
      },
      extra.content.prepare(config.content),
      extra.entries.prepare(config.entries),
      extra.libraries.prepare(config.libraries),
      extra.cache.prepare()
    );

    var b = browserify(options);
    extra.content.process(b);
    extra.entries.process(b);
    extra.libraries.process(b);
    extra.cache.process(b);
    return b;
  },

  invalidate: function(filePath) {
    extra.cache.invalidate(filePath);
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
      return stream.concat(config.concat, config.sourceMaps);
    });
  },

  /**
   * @param {BundlerConfig~config} config
   * @returns {Transform}
   * @private
   */
  _uglify: function(config) {
    return stream.condition(config.uglify, function() {
      return stream.uglify({
        mangle: false,
        compress: false,
        output: {
          quote_keys: true,
          beautify: false
        }
      })
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
