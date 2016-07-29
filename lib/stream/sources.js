var through = require('through2');
var readonly = require('read-only-stream');
var vfs = require('vinyl-fs');

module.exports = function(config) {
  var mainStream = new through();
  var pipeEnded = false;
  var pending = config.content.length;

  vfs.src(getGlobs(config)).pipe(through.obj(filePipeRead, filePipeEnd));
  config.content.forEach(processContent);

  return readonly(mainStream);

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

  function filePipeRead(file, encoding, next) {
    mainStream.push(file.contents.toString(encoding));
    next();
  }

  function filePipeEnd() {
    pipeEnded = true;
    done();
  }

  function processContent(content) {
    pending--;
    mainStream.push(content.data);
    done();
  }

  function done() {
    if(0 === pending && pipeEnded) {
      mainStream.push(null);
    }
  }
};
