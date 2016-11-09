var _ = require('underscore');
var deap = require('deap');
var browserify = require('browserify');
var pipeline = require('pumpify').obj;
var cliConfig = require('../config');

var stream = require('../stream');
var plugins = require('./plugins');
var debug = stream.debug;

module.exports = {

  /**
   * @params {BundlerConfig} bundlerConfig
   * @returns {Stream}
   */
  process: function(bundlerConfig) {
    var config = bundlerConfig.get();
    var start = new Date(), step = new Date(), concatStep = new Date(), browserifyStep = new Date();

    return pipeline(
      this._merge(
        pipeline(
          this._concat(config),
          debug('> concat', concatStep)
        ),
        pipeline(
          this._browerify(config),
          debug('> browerify', browserifyStep),
          this._map(config),
          debug('> map', browserifyStep)
        )
      ),
      debug('merge', step),
      this._remap(config),
      debug('remap', step),
      this._uglify(),
      debug('uglify', step),
      debug('total', start)
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
    stream.concat.cache.invalidate(filePath);
  },

  clearCache: function() {
    plugins.cache.clear();
    stream.concat.cache.clear();
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
   * @param {Stream...} streams
   * @returns {Transform}
   * @private
   */
  _merge: function(streams) {
    return stream.merge(_.toArray(arguments));
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
  },

  /**
   * @private
   */
  _uglify: function() {
    var uglifyConfig = cliConfig.get('uglify', {
      enabled: false
    });
    return stream.condition(uglifyConfig.enabled, function() {
      return stream.uglify(uglifyConfig);
    });
  }
};
