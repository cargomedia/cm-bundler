module.exports = {

  /** @type {String[]} */
  entries: [],

  /**
   * @param {String[]} entries
   * @returns {Object} browserify options
   */
  prepare: function(entries) {
    this.entries = entries;
    return {};
  },

  /**
   * @param {Browserify} browserify
   * @returns {Browserify}
   */
  process: function(browserify) {
    this.entries.forEach(function(entry) {
      browserify.add(entry);
    });
    return browserify;
  }
};
