var through = require('through2');
var glob = require('glob');

module.exports = function(patterns) {
  var stream = through.obj();
  var patternIndex = 0;
  processPattern(patterns[patternIndex]);
  return stream;

  function processPattern(pattern) {
    glob(pattern, function(error, matches) {
      if (error) {
        stream.emit('error', error);
      } else {
        matches.forEach(function(filePath) {
          stream.push(filePath);
        });
      }
      if (++patternIndex < patterns.length) {
        processPattern(patterns[patternIndex]);
      } else {
        stream.push(null);
      }
    });
  }
};
