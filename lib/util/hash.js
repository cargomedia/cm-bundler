var crypto = require('crypto');

module.exports = {
  /**
   * @param {*} mixed
   * @returns {String}
   */
  md5: function(mixed) {
    return crypto.createHash('md5').update(JSON.stringify(mixed)).digest('hex');
  }
};
