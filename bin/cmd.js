#!/usr/bin/env node
try {
  var sourcemaps = require('gulp-sourcemaps');
  var program = require('commander');
  var version = require('../package.json').version;
  var output = require('../lib/stream/output');

  var jsonConfig = null;

  program
    .version(version)
    .option('-c, --code-only', 'output the source code only')
    .option('-s, --sourcemaps-only', 'output the sourcemaps only')
    .option('-n, --nice', 'JSON formatting.')
    .arguments('<json>')
    .action(function(json) {
      jsonConfig = JSON.parse(json);
    });

  program.parse(process.argv);

  if (!jsonConfig || !program.args.length > 1) {
    program.outputHelp();
    process.exit(1);
    return;
  }

  if (program.sourcemapsOnly) {
    jsonConfig.sourceMaps = true;
  }

  require('../lib/bundler')
    .process(jsonConfig)
    .pipe(output({
      code: program.codeOnly,
      sourcemaps: program.sourcemapsOnly,
      nice: program.nice
    }));

} catch (error) {
  process.stderr.write(error.stack + "\n");
  process.exit(1);
}
