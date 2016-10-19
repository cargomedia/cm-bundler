var through = require('through2');
var deap = require('deap');
var VinylFile = require('vinyl');
var readonly = require('read-only-stream');

/**
 * @typedef {Object} Browserify~content
 * @property {String} path
 * @property {String} source
 * @property {Boolean} [execute=true]
 * @property {Boolean} [expose=false]
 */

module.exports = {

  /** @type {Browserify~content[]} */
  contents: [],

  /** @type {String[]} */
  modules: [],

  /**
   * @param {Browserify~content[]} contents
   * @returns {Object} browserify options
   */
  prepare: function(contents) {
    var modules = this.modules;
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

      modules.push(content.path);
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
    browserify.plugin(generateRequires, {generated: this.modules});

    function generateRequires(b, opts) {
      var generatedBundles = opts.generated || [];
      var deps = b.pipeline.get('deps');
      deps = deps.get(0);
      var defaultResolver = deps.resolver;
      deps.resolver = function(id, opts, cb) {
        if (generatedBundles.indexOf(id) >= 0) {
          cb(null, id);
        } else {
          return defaultResolver(id, opts, cb);
        }
      };
    }

    var exposed = this.contents.filter(function(content) {
      return content.expose;
    });
    if (exposed.length > 0) {
      browserify._bpack.hasExports = true;
    }

    return browserify;
  }
};
