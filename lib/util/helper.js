var crypto = require('crypto');
var Promise = require('bluebird');

module.exports = {

  /**
   * @param {Number|String} val
   * @param {Number} size
   * @param {String} [paddingStr=' ']
   * @returns {String}
   */
  paddingLeft: function(val, size, paddingStr) {
    paddingStr = paddingStr || ' ';
    var str = val.toString();
    var strSize = str.length;
    if (strSize > size) {
      return '…' + str.slice(str.length - (size - 1), str.length);
    } else {
      return (new Array((size + 1) - strSize).join(paddingStr) + str);
    }
  },

  /**
   * @param {Number|String} val
   * @param {Number} size
   * @param {String} [paddingStr=' ']
   * @returns {String}
   */
  paddingRight: function(val, size, paddingStr) {
    paddingStr = paddingStr || ' ';
    var str = val.toString();
    var strSize = str.length;
    if (strSize > size) {
      return str.slice(0, size - 1) + '…';
    } else {
      return str + (new Array((size + 1) - strSize).join(paddingStr));
    }
  },

  /**
   * @param {*} mixed
   * @returns {String}
   */
  hash: function(mixed) {
    return crypto.createHash('md5').update(JSON.stringify(mixed)).digest('hex');
  },

  /**
   * @param {Stream} stream
   * @returns {Promise}
   */
  streamPromise: function(stream) {
    var promise = new Promise(function(resolve, reject) {
      var output = null;
      stream.on('data', function(data) {
        output = data;
      });
      stream.on('finish', function() {
        resolve(output);
      });
      stream.on('error', reject);
    });
    promise.finally(function() {
      stream.removeAllListeners();
    });
    return promise;
  }
};
