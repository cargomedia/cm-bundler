#!/usr/bin/env node
var through = require('through2');

module.exports = function(condition, transformer) {
  if (!condition) {
    return through.obj(function(file, encoding, callback) {
      callback(null, file);
    });
  } else {
    return transformer();
  }
};
