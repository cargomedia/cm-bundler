var Transform = require('transform');
var convert = require('convert-source-map');

module.exports = {
  cleanupMapPaths: function() {
   var transformStream = new Transform({objectMode: true});
    /**
     * @param {Buffer|string} file
     * @param {string=} encoding - ignored if file contains a Buffer
     * @param {function(Error, object)} callback - Call this function (optionally with an
     *          error argument and data) when you are done processing the supplied chunk.
     */
    transformStream._transform = function(file, encoding, callback) {
      var failed = function(message) {
        callback(new Error(message));
      };

      if (file.isStream()) {
          failed('Streaming not supported');
        }

      var sourceMap = convert.fromSource(file.contents.toString());
      sourceMap.sources.forEach(function(source, i) {
        sourceMap.sources[i] = '../../../../../../' + source;
      });
      
      return 
    };

    return transformStream;
  }
};
