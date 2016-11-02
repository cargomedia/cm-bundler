module.exports = {

  /** @type {String[]} */
  libraries: [],

  /**
   * @param {String[]} libraries
   * @returns {Object} browserify options
   */
  prepare: function(libraries) {
    this.libraries = libraries;
    return {};
  },

  /**
   * @param {Browserify} browserify
   * @returns {Browserify}
   */
  process: function(browserify) {
    this.libraries.forEach(function(library) {
      browserify.require(library);
    });
    return browserify;
  }
};
