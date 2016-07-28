var browserify = require('browserify');
var extend = require('xtend');
var buffer = require('vinyl-buffer');
var source = require('vinyl-source-stream');
var condition = require('../stream/condition');
var concat = require('../stream/concat');
var sourcemaps = require('gulp-sourcemaps');
var uglify = require('gulp-uglify');

module.exports = {

  /** @type {Object} */
  config: {
    baseDir: '/',
    paths: [],
    uglify: false,
    sourceMaps: false,
    content: [],
    libraries: [],
    entries: [],
    concat: []
  },

  /**
   * @returns {{code: String, sourcemaps: String|null}}
   */
  process: function() {
    var config = this.parseArguments();
    config = this.mergeConfig(config);
    var result = {
      sourcemaps: null,
      code: null
    };

    return this
      .browserify(config)
      .pipe(source('generated.js'))
      .pipe(buffer())
      .pipe(condition(config.sourceMaps, function() {
        return sourcemaps.init({loadMaps: true});
      }))
      .pipe(condition(config.concat.length > 0, function() {
        return concat(config.concat, config.sourceMaps);
      }))
      .pipe(condition(config.uglify, function() {
        return uglify();
      }))
      .pipe(condition(config.sourceMaps, function() {
        return sourcemaps.write();
      }));
  },

  /**
   * @param {Object} config
   * @param {Function} [callback]
   * @returns {Buffer}
   */
  browserify: function(config, callback) {
    var paths = [config.baseDir].concat(config.paths);
    var b = browserify({
      basedir: config.baseDir,
      paths: paths,
      debug: config.sourceMaps
    });

    this.addEntries(b, config.entries);
    this.addLibraries(b, config.libraries);
    this.addContent(b, config.content);

    return b.bundle(callback);
  },

  /**
   * @param {Browserify} browserify
   * @param {Object[]} config
   */
  addContent: function(browserify, config) {
    require('./content').process(browserify, config);
  },

  /**
   * @param {Browserify} browserify
   * @param {String[]} config
   */
  addEntries: function(browserify, config) {
    require('./entries').process(browserify, config);
  },

  /**
   * @param {Browserify} browserify
   * @param {String[]} config
   */
  addLibraries: function(browserify, config) {
    require('./libraries').process(browserify, config);
  },

  /**
   * @param {Object} config
   * @returns {Object}
   */
  mergeConfig: function(config) {
    return extend(this.config, config);
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
