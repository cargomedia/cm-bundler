var browserify = require('browserify');
var convert = require('convert-source-map');
var extend = require('xtend');

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
   * @param {Object} config
   * @returns {Promise}
   */
  process: function(config) {
    return new Promise(function(resolve, reject) {
      config = this.mergeConfig(config);

      var paths = [config.baseDir].concat(config.paths);
      var b = browserify({
        basedir: config.baseDir,
        paths: paths,
        debug: config.sourceMaps
      });

      this.addEntries(b, config.entries);
      this.addLibraries(b, config.libraries);
      this.addContent(b, config.content);

      b.bundle(function(error, src) {
        if(error) {
          reject(error);
        } else {
          // var str = src.toString('utf-8');
          // var map = convert.fromSource(str);
          // map.setProperty()

          resolve(src);
        }
      });
    }.bind(this));
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
