var path = require('path');
var through = require('through2');

module.exports = function(replace) {
  replace = replace || {};

  return through.obj(read);

  function read(file, _, cb) {
    var error = null;

    if (file.isStream()) {
      return cb(new Error('cm-bundler.remap: Streaming not supported'));
    }

    if (file.sourceMap && Array.isArray(file.sourceMap.sources)) {
      var sources = file.sourceMap.sources;
      var remappedSources = [];
      sources.forEach(function(source) {
        var replaceValue;
        for (replaceValue in replace) {
          if (replace.hasOwnProperty(replaceValue)) {
            var match = replace[replaceValue];
            var search = match instanceof RegExp ? match : new RegExp(match, 'gi');
            if (search.test(source)) {
              source = source.replace(search, replaceValue);
            }
          }
        }

        if (-1 !== remappedSources.indexOf(source)) {
          error = new Error('Failed to remap the source, `' + source + '` path already exists!');
        }
        remappedSources.push(source);
      });

      file.sourceMap.sources = remappedSources;
    }

    if (error) {
      return cb(error);
    }

    this.push(file);
    cb();
  }
};
