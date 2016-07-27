module.exports = {
  process: function(browserify, entries) {
    entries.forEach(function(entry) {
      browserify.add(entry);
    });
  }
};
