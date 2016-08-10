module.exports = {

  libraries: [],

  /**
   * @param {String[]} libraries
   * @returns {Object}
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
