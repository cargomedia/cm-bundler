var crypto = require('crypto');

module.exports = {

  /**
   * @param {Number|String} val
   * @param {Number} size
   * @param {Number} [paddingStr=0]
   * @returns {String}
   */
  padding: function(val, size, paddingStr) {
    paddingStr = paddingStr || 0;
    return (new Array(6 - val.toString().length).join(paddingStr) + val);
  },

  /**
   * @param {*} mixed
   * @returns {String}
   */
  hash: function(mixed) {
    return crypto.createHash('md5').update(JSON.stringify(mixed)).digest('hex');
  }
};
