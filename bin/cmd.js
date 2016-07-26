#!/usr/bin/env node

try {
  var bundler = require('../lib/bundler');
  var config = bundler.parseArguments();
  bundler.process(config).then(function(src) {
    process.stdout.write(src.toString('utf-8'));
  });

} catch(error) {
  process.stderr.write(error.stack + "\n");
  process.exit(1);
}
