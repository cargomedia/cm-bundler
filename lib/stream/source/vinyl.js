var through = require('through2');
var fs = require('graceful-fs');
var VinylFile = require('vinyl');
var glob = require('./glob');

module.exports = function(patterns) {
  return glob(patterns)
    .pipe(through.obj(read));

  function read(filePath, _, cb) {
    fs.readFile(filePath, function(error, data) {
      if (error) {
        return cb(error);
      }
      cb(null, new VinylFile({
        cwd: '/',
        base: '/',
        path: filePath,
        contents: data
      }));
    });
  }
};
