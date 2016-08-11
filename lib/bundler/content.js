var through = require('through2');
var deap = require('deap');
var VinylFile = require('vinyl');
var readonly = require('read-only-stream');

/**
 * @typedef {Object} Content
 * @property {String} path
 * @property {String} data
 * @property {Boolean} [execute=true]
 * @property {Boolean} [expose=false]
 * @property {Boolean} [parse=false]
 */

module.exports = {

  /** @type {Content[]} */
  contents: [],

  /** @type {{String: String}} */
  fileCache: {},

  /**
   * @param {Content[]} contents
   * @returns {Object} browserify options
   */
  prepare: function(contents) {
    var fileCache = this.fileCache;
    this.contents = contents.map(function(content) {
      content = deap({
        path: null,
        source: null,
        execute: true,
        expose: false
      }, content);

      if (null === content.path) {
        throw new Error('content.path property required.');
      }
      if (null === content.source) {
        throw new Error('content.source property required.');
      }

      fileCache[content.path] = content.source;
      return content;
    });

    return {};
  },

  /**
   * @param {Browserify} browserify
   * @returns {Browserify}
   */
  process: function(browserify) {
    var noParse = [];

    this.contents.forEach(function(content) {
      var options = {
        file: content.path,
        expose: content.expose ? content.path : false
      };

      var stream = readonly(through());
      stream.push(content.source);
      stream.push(null);

      if (content.execute) {
        browserify.add(stream, options);
      } else {
        browserify.require(stream, options);
      }
    });

    // see https://github.com/substack/node-browserify/issues/1436#issuecomment-159000656
    browserify.plugin(generateRequires, {generated: this.fileCache});

    function generateRequires(b, opts) {
      var generatedBundles = opts.generated || {};
      var deps = b.pipeline.get('deps');
      deps = deps.get(0);
      var defaultResolver = deps.resolver;
      deps.resolver = function(id, opts, cb) {
        if (generatedBundles[id]) {
          cb(null, id);
        } else {
          return defaultResolver(id, opts, cb);
        }
      };
    }

    return browserify;
  }
};
