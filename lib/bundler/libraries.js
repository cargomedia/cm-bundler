module.exports = {
  process: function(browserify, libraries) {
    (libraries || []).forEach(function(library) {
      browserify.require(library);
    });
  }
};
