var crypto = require('crypto');

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
  }
};
