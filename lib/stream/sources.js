var through = require('through2');
var readonly = require('read-only-stream');
var mtime = require('./source/mtime');

module.exports = function(config) {
  return mtime(getGlobs(config));

  function getGlobs(config) {
    var globs = config.concat;
    ['**/*.js'].forEach(function(wildcard) {
      globs = globs.concat(
        config.paths.map(function(path) {
          return path + '/' + wildcard;
        })
      );
    });
    return globs.concat(
      config.entries.map(function(entry) {
        return config.baseDir + '/' + entry;
      })
    );
  }
};
