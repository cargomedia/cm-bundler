var _ = require('underscore');
var deap = require('deap');
var browserify = require('browserify');
var pipeline = require('pumpify').obj;
var cliConfig = require('../config');

var stream = require('../stream');
var plugins = require('./plugins');

module.exports = {

  /**
   * @params {BundlerConfig} bundlerConfig
   * @returns {Stream}
   */
  process: function(bundlerConfig) {
    var config = bundlerConfig.get();
    var start = new Date(), step = new Date(), concatStep = new Date(), browserifyStep = new Date();

    var b = this.browserify(config);
    return pipeline(
      merge(
        pipeline(
          concat(config), /*    */ debug('> concat', concatStep)
        ),
        pipeline(
          build(b), /*          */ debug('> browerify', browserifyStep),
          map(), /*             */ debug('> map', browserifyStep)
        )
      ), /*                     */ debug('merge', step),
      remap(config), /*         */ debug('remap', step),
      uglify(), /*              */ debug('uglify', step),
      /*                        */ debug('total', start)
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
  }
};


/**
 * @param {Browserify} b
 * @returns {Transform}
 */
function build(b) {
  return pipeline(
    b.bundle(),
    stream.vinyl('.cm-bundler/require'),
    stream.buffer()
  );
}

/**
 * @returns {Transform}
 */
function map() {
  return stream.sourcemaps.init({
    loadMaps: true
  });
}

/**
 * @param {BundlerConfig~config} config
 * @returns {Transform}
 */
function concat(config) {
  return stream.concat(config.concat, config.baseDir);
}

/**
 * @param {Stream...} streams
 * @returns {Transform}
 */
function merge(streams) {
  return stream.merge(_.toArray(arguments));
}

/**
 * @param {BundlerConfig~config} config
 * @returns {Transform}
 */
function remap(config) {
  return stream.remap(
    config.sourceMaps.replace
  );
}

/**
 * @returns {Transform}
 */
function uglify() {
  var uglifyConfig = cliConfig.get('uglify', {
    enabled: false
  });
  return stream.condition(uglifyConfig.enabled, function() {
    return stream.uglify(uglifyConfig);
  });
}

/**
 * @param {String} message
 * @param {Date} time
 * @returns {Transform}
 */
function debug(message, time) {
  return stream.debug(message, time);
}
