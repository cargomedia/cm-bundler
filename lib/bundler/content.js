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

  /**
   * @param {Content[]} contents
   * @returns {{noParse: Array}} browserify options
   */
  prepare: function(contents) {
    var noParse = [];
    this.contents = contents.map(function(content) {
      content = deap({
        path: null,
        data: null,
        execute: true,
        expose: false,
        parse: false
      }, content);

      if (null === content.path) {
        throw new Error('content.path property required.');
      }
      if (null === content.data) {
        throw new Error('content.data property required.');
      }

      if (!content.parse) {
        noParse.push(content.path);
      }

      return content;
    });
    return {noParse: noParse};
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
      stream.push(content.data);
      stream.push(null);

      if (content.execute) {
        browserify.add(stream, options);
      } else {
        browserify.require(stream, options);
      }
    });

    return browserify;
  }
};
