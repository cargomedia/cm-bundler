#!/usr/bin/env node
try {
  var sourcemaps = require('gulp-sourcemaps');
  var program = require('commander');
  var version = require('../package.json').version;
  var condition = require('../lib/stream/condition');
  var output = require('../lib/stream/output');

  var jsonConfig = null;
  var options = {
    code: false,
    sourcemaps: false
  };

  program.version(version);

  program
    .command('code <json>')
    .description('generate the bundle code')
    .action(function(json) {
      options.code = true;
      jsonConfig = JSON.parse(json);
    });

  program
    .command('sourcemaps <json>')
    .description('generate the sourcemaps')
    .action(function(json) {
      options.sourcemaps = true;
      jsonConfig = JSON.parse(json);
    });

  program
    .command('all <json>')
    .description('generate the bundle code + inline sourcemaps')
    .action(function(json) {
      jsonConfig = JSON.parse(json);
    });

  program.parse(process.argv);

  if (!jsonConfig || program.args.length > 2) {
    program.outputHelp();
    process.exit(1);
    return;
  }

  require('../lib/bundler')
    .process(jsonConfig)
    .pipe(condition(!options.code && !options.sourcemaps, function() {
      return sourcemaps.write();
    }))
    .pipe(output(options));

} catch (error) {
  process.stderr.write(error.stack + "\n");
  process.exit(1);
}
