#!/usr/bin/env node

try {
  var version = require('../package.json').version;
  var program = require('commander');
  var output = require('../lib/stream/output');

  var jsonConfig = null;

  program
    .version(version)
    .arguments('[json]')
    .action(function (json) {
      jsonConfig = JSON.parse(json);
    });

  program.parse(process.argv);

  if (!jsonConfig || !program.args.length > 1) {
    program.outputHelp();
    process.exit(1);
  } else {
    require('../lib/bundler')
      .process(jsonConfig)
      .pipe(output());
  }

} catch (error) {
  process.stderr.write(error.stack + "\n");
  process.exit(1);
}
