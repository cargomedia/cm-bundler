#!/usr/bin/env node

try {
  require('../lib/bundler')
    .process()
    .pipe(process.stdout);
} catch(error) {
  process.stderr.write(error.stack + "\n");
  process.exit(1);
}
