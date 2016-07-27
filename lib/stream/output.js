var through = require('through2');

module.exports = function() {
  return through.obj(function(file) {
    file.pipe(process.stdout, {end: false});
  });
};
