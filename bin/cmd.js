#!/usr/bin/env node
var through = require('through2');

try {
  require('../lib/bundler')
    .process()
    .pipe(
      through.obj(function(file, encoding, callback) {
        file.pipe(process.stdout, {end: false});
      })
    );

} catch(error) {
  process.stderr.write(error.stack + "\n");
  process.exit(1);
}
