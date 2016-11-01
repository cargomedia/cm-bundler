var deap = require('deap');
var browserify = require('browserify');
var pipeline = require('pumpify').obj;
var stream = require('../stream');


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
    var content = require('./content');
    var entries = require('./entries');
    var libraries = require('./libraries');

    var options = deap(
      {
        basedir: config.baseDir,
        paths: [config.baseDir].concat(config.paths),
        ignoreMissing: config.ignoreMissing,
        debug: true
      },
      content.prepare(config.content),
      entries.prepare(config.entries),
      libraries.prepare(config.libraries)
    );

    var b = browserify(options);
    content.process(b);
    entries.process(b);
    libraries.process(b);
    return b;
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
