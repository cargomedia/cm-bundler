var through = require('through2');
var vinyl = require('./source/vinyl');

module.exports = function(config) {
  return vinyl(getGlobs(config));

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
