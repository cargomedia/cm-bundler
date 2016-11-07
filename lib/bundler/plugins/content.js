var through = require('through2');
var deap = require('deap');
var _ = require('underscore');
var VinylFile = require('vinyl');
var readonly = require('read-only-stream');

/**
 * @typedef {Object} Browserify~content
 * @property {String} path
 * @property {String} source
 * @property {Boolean} [execute=true]
 * @property {Boolean} [expose=false]
 */

/**
 * @param {Browserify} b
 * @param {{contents: Browserify~content[]}} options
 * @return {Browserify}
 */
function BundlerContent(b, options) {
  var noParse = [];
  var modules = [];
  var contents = (options.contents || []).map(function(content) {
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

  contents.forEach(function(content) {
    var options = {
      file: content.path,
      expose: content.expose ? content.path : false
    };

    var stream = readonly(through());
    stream.push(content.source);
    stream.push(null);

    if (content.execute) {
      b.add(stream, options);
    } else {
      b.require(stream, options);
    }
  });

  var deps = b.pipeline.get('deps').get(0);
  var defaultResolver = deps.resolver;
  deps.resolver = function(id, opts, cb) {
    if (modules.indexOf(id) >= 0) {
      cb(null, id);
    } else {
      return defaultResolver(id, opts, cb);
    }
  };

  b._bpack.hasExports = _.any(contents, function(content) {
    return content.expose;
  });

  return b;
}

module.exports = BundlerContent;
