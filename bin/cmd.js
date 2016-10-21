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
    .option('-v, --verbose', 'be more verbose')
    .parse(process.argv);

  if (program.args.length > 2) {
    program.outputHelp();
    process.exit(1);
    return;
  }

  verbose = program.verbose;

  server = new UnixSocketServer(program.socket || '/var/run/cm-bundler.sock');

  server.on('code', function(client, jsonConfig) {
    Promise
      .try(function() {
        return configCache.get(jsonConfig);
      })
      .then(function(config) {
        console.log('generate code for config (key:%s, liveKey:%s)', config.key(), config.liveKey());
        if (verbose) {
          console.log(JSON.stringify(config.get(), null, '  '));
        }
        return config;
      })
      .then(function(config) {
        bundler
          .process(config)
          .pipe(filter.code())
          .pipe(filter.createResponse())
          .pipe(client);
      })
      .catch(function(error) {
        console.error(error.stack);
        filter
          .createErrorResponse(error)
          .pipe(client);
      });
  });
  server.on('sourcemaps', function(client, jsonConfig) {
    Promise
      .try(function() {
        return configCache.get(jsonConfig);
      })
      .then(function(config) {
        console.log('generate sourcemaps for config (key:%s, liveKey:%s)', config.key(), config.liveKey());
        if (verbose) {
          console.log(JSON.stringify(config.get(), null, '  '));
        }
        return config;
      })
      .then(function(config) {
        bundler
          .process(config)
          .pipe(filter.sourcemaps())
          .pipe(filter.createResponse())
          .pipe(client);
      })
      .catch(function(error) {
        console.error(error.stack);
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
    console.log('Stopping CM Bundler service...');
  });

  server
    .start()
    .then(function(server) {
      console.info('Service listening to %s', server.address());
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
