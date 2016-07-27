#!/usr/bin/env node
var output = require('../lib/stream/output');

try {
  require('../lib/bundler')
    .process()
    .pipe(output());

} catch(error) {
  process.stderr.write(error.stack + "\n");
  process.exit(1);
}
