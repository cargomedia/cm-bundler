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
  var helper = require('../lib/util/helper');
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

  var rid = 0;

  function processRequest(client, jsonConfig, filterTransform, filterName) {
    var requestId = helper.padding(++rid, 6);
    var configId = helper.hash(jsonConfig).substr(0, 6);
    var start = new Date();
    logger.info('[%s:%s] generate %s...', requestId, configId, filterName);
    logger.debug('[%s:%s] %s', requestId, configId, JSON.stringify(jsonConfig, null, '  '));
    Promise
      .try(function() {
        return configCache.get(jsonConfig);
      })
      .then(function(config) {
        return new Promise(function(resolve, reject) {
          bundler
            .process(config)
            .pipe(filterTransform())
            .pipe(filter.createResponse())
            .pipe(client)
            .on('error', reject)
            .on('end', resolve);
        });
      })
      .then(function() {
        logger.info('[%s:%s] %s generated in %ss', requestId, configId, filterName, (new Date() - start) / 1000);
      })
      .catch(function(error) {
        logger.error('[%s:%s] %s', requestId, configId, error.stack);
        filter
          .createErrorResponse(error)
          .pipe(client);
      });
  }

  server.on('code', function(client, jsonConfig) {
    processRequest(client, jsonConfig, filter.code, 'code');
  });
  server.on('sourcemaps', function(client, jsonConfig) {
    processRequest(client, jsonConfig, filter.sourcemaps, 'sourcemaps');
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
