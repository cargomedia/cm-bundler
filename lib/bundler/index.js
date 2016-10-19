var browserify = require('browserify');
var deap = require('deap');
var buffer = require('vinyl-buffer');
var vinylSource = require('vinyl-source-stream');
var sourcemaps = require('gulp-sourcemaps');
var uglify = require('gulp-uglify');
var sources = require('../stream/sources');
var condition = require('../stream/condition');
var concat = require('../stream/concat');
var remap = require('../stream/remap');
var StreamCache = require('../stream/cache');
var BundlerConfig = require('./config');

var cache = new StreamCache();

module.exports = {

  /**
   * @params {BundlerConfig~config} jsonConfig
   * @returns {Stream}
   */
  process: function(jsonConfig) {
    var self = this;
    var bundlerConfig = new BundlerConfig(jsonConfig);

    return cache.get(bundlerConfig.key(), function() {
      var config = bundlerConfig.get();
      return self
        .browserify(config)
        .bundle()
        .pipe(vinylSource(config.bundleName))
        .pipe(buffer())
        .pipe(condition(config.sourceMaps.enabled, function() {
          return sourcemaps.init({loadMaps: true});
        }))
        .pipe(condition(config.concat.length > 0, function() {
          return concat(config.concat, config.sourceMaps);
        }))
        .pipe(condition(config.uglify, function() {
          return uglify({
            mangle: false,
            compress: false,
            output: {
              quote_keys: true,
              beautify: false
            }
          });
        }))
        .pipe(condition(config.sourceMaps.enabled, function() {
          return remap(config.sourceMaps.replace);
        }));
    });
  },

  /**
   * @param {Object} config
   * @param {Function} [callback]
   * @returns {Browserify}
   */
  browserify: function(config, callback) {
    var content = require('./content');
    var entries = require('./entries');
    var libraries = require('./libraries');

    var options = deap(
      {
        basedir: config.baseDir,
        paths: [config.baseDir].concat(config.paths),
        debug: config.sourceMaps.enabled
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
  }
};
