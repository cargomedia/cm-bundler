var browserify = require('browserify');
var extend = require('xtend');
var buffer = require('vinyl-buffer');
var source = require('vinyl-source-stream');
var sourcemaps = require('gulp-sourcemaps');

module.exports = {

  /** @type {Object} */
  config: {
    baseDir: '/',
    paths: [],
    sourceMaps: false,
    content: [],
    libraries: [],
    entries: []
  },


  /**
   * @returns {Buffer}
   */
  process: function() {
    var config = this.parseArguments();
    config = this.mergeConfig(config);
    return this
      .browserify(config)
      .pipe(source('generated.js'))
      .pipe(buffer())
      .pipe(sourcemaps.init({loadMaps: true}))
      .pipe(sourcemaps.write())
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
    if(process.argv.length < 3) {
      throw new Error('JSON argument required.');
    }
    try  {
      var config = JSON.parse(process.argv[2]);
    } catch(e) {
      throw new Error('JSON argument invalid.');
    }
    return this.mergeConfig(config);
  }
};
