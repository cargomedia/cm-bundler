var through = require('through2');
var fs = require('graceful-fs');
var glob = require('./glob');

module.exports = function(patterns) {
  return glob(patterns).pipe(through(read));

  function read(filePath, _, cb) {
    fs.stat(filePath.toString(), function(error, info) {
      if (error) {
        return cb(error);
      }
      cb(null, info.mtime.toString());
    });
  }
};
