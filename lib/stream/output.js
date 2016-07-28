var through = require('through2');

module.exports = function(options) {
  return through.obj(function(file, encoding) {
    var stringify = function(obj) {
      return JSON.stringify(obj, null, options.nice ? '  ' : null)
    };
    var stdout = '';
    var result = {
      code: file.contents.toString(encoding),
      sourcemaps: file.sourceMap ? stringify(file.sourceMap) : null
    };

    if(options.code) {
      stdout = result.code;
    } else if(options.sourcemaps) {
      stdout = result.sourcemaps;
    } else {
      stdout = stringify(result);
    }
    
    process.stdout.write(stdout + "\n");
  });
};
