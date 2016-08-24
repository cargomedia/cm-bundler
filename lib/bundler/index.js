var browserify = require('browserify');
var deap = require('deap');
var buffer = require('vinyl-buffer');
var vinylSource = require('vinyl-source-stream');
var sourcemaps = require('gulp-sourcemaps');
var uglify = require('gulp-uglify');
var sources = require('../stream/sources');
var condition = require('../stream/condition');
var checksum = require('../stream/checksum');
var concat = require('../stream/concat');
var remap = require('../stream/remap');

module.exports = {

  /** @type {Object} */
  config: {
    bundleName: '.bundle.js',
    baseDir: '/',
    paths: [],
    uglify: false,
    sourceMaps: {
      enabled: false,
      replace: {
        '': /\.\.\//g,
        '_pack/.prelude': '.*/browser-pack/_prelude.js'
      }
    },
    content: [],
    libraries: [],
    entries: [],
    concat: []
  },

  /**
   * @params {Object} jsonConfig
   * @returns {Stream}
   */
  process: function(jsonConfig) {
    var config = this.mergeConfig(jsonConfig);
    return this
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
        return uglify();
      }))
      .pipe(condition(config.sourceMaps.enabled, function() {
        return remap(config.sourceMaps.replace);
      }));
  },

  /**
   * @params {Object} jsonConfig
   * @returns {Stream}
   */
  checksum: function(jsonConfig) {
    var config = this.mergeConfig(jsonConfig);
    return sources(config)
      .pipe(checksum());
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
  },

  /**
   * @param {Object} config
   * @returns {Object}
   */
  mergeConfig: function(config) {
    return deap.extend(this.config, config);
  },

  /**
   * @returns {Object}
   */
  parseArguments: function() {
    if (process.argv.length < 3) {
      throw new Error('JSON argument required.');
    }
    try {
      var config = JSON.parse(process.argv[2]);
    } catch (e) {
      throw new Error('JSON argument invalid.');
    }
    return this.mergeConfig(config);
  }
};
