#!/usr/bin/env node
var verbose = true;
var server = null;

try {
  process.on('SIGINT', function() {
    abort(null, 2);
  });
  process.on('SIGTERM', function() {
    abort();
  });


  var logger = require('../lib/util/logger');
  var logConfig = require('../lib/util/logger/config');
  var version = require('../package.json').version;
  var program = require('commander');
  var bundler = require('../lib/bundler');
  var filter = require('../lib/stream/filter');
  var Promise = require('bluebird');
  var UnixSocketServer = require('../lib/socket/server');
  var configCache = require('../lib/config/cache').getInstance();

  program
    .version(version)
    .option('-s, --socket <file>', 'unix domain socket file (default: /var/run/cm-bundler.sock)')
    .option('-f, --file <file>', 'output logs to a file')
    .option('-nc, --no-color', 'output logs to standard output without colors')
    .option('-v, --verbose', 'be verbose')
    .parse(process.argv);

  if (program.args.length > 2) {
    program.outputHelp();
    process.exit(1);
    return;
  }

  verbose = program.verbose;
  logConfig({
    level: verbose ? 'debug' : 'info',
    file: program.file,
    noColor: program.noColor
  });

  server = new UnixSocketServer(program.socket || '/var/run/cm-bundler.sock');

  server.on('code', function(client, jsonConfig) {
    logger.info('code requested');
    logger.debug(JSON.stringify(jsonConfig, null, '  '));
    Promise
      .try(function() {
        return configCache.get(jsonConfig);
      })
      .then(function(config) {
        bundler
          .process(config)
          .pipe(filter.code())
          .pipe(filter.createResponse())
          .pipe(client);
      })
      .catch(function(error) {
        logger.error(error.stack);
        filter
          .createErrorResponse(error)
          .pipe(client);
      });
  });
  server.on('sourcemaps', function(client, jsonConfig) {
    logger.info('sourcemaps requested');
    logger.debug(JSON.stringify(jsonConfig, null, '  '));
    Promise
      .try(function() {
        return configCache.get(jsonConfig);
      })
      .then(function(config) {
        bundler
          .process(config)
          .pipe(filter.sourcemaps())
          .pipe(filter.createResponse())
          .pipe(client);
      })
      .catch(function(error) {
        logger.error(error.stack);
        filter
          .createErrorResponse(error)
          .pipe(client);
      });
  });
  server.on('error', function(error) {
    server.stop();
    abort(error);
  });
  server.on('stop', function(error) {
    logger.info('stopping CM Bundler service...');
  });

  server
    .start()
    .then(function(server) {
      logger.info('service listening to %s', server.address());
    })
    .catch(function(error) {
      abort(error);
    });

} catch (error) {
  abort(error);
}

function abort(error, signal) {
  if (server) {
    server.stop();
  }
  if (error) {
    console.error(verbose ? error.stack : 'Error: ' + error.message);
    process.exit(1);
  } else if (signal) {
    process.exit(signal + 128);
  }
}
