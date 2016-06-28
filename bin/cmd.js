#!/usr/bin/env node

var stream = require('stream');
var browserify = require('browserify');
var readConfig = require('../lib/readConfig');

try {
  var config = readConfig({
    content: [],
    libraries: [],
    entries: [],
    paths: [],
    sourceMaps: false
  });

  var b = browserify({
    entries: config.entries,
    paths: config.paths,
    debug: config.sourceMaps
  });

  config.libraries.forEach(function(library) {
    b.require(library);
  });

  config.content.forEach(function(content) {
    var options = {expose: content.name, file: content.path || content.name};
    var s = new stream.Readable();
    s._read = function noop() {
    };
    s.push(content.data);
    s.push(null);

    if (content.require) {
      b.require(s, options);
    } else {
      b.add(s, options);
    }
  });

  b.bundle().pipe(process.stdout);

} catch(error) {
  process.stderr.write(error.stack + "\n");
  process.exit(1);
}
