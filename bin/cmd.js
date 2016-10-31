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

  var util = require('util');
  var program = require('commander');
  var pipeline = require('pumpify');
  var cls = require('continuation-local-storage');
  var clsPatcher = require('cls-bluebird');
  var Promise = require('bluebird');

  var logger = require('../lib/util/logger');
  var logConfig = require('../lib/util/logger/config');
  var version = require('../package.json').version;
  var bundler = require('../lib/bundler');
  var filter = require('../lib/stream/filter');
  var UnixSocketServer = require('../lib/socket/server');

  var session = cls.createNamespace('cm-bundler.request.session');
  clsPatcher(session);

  var configCache = require('../lib/config/cache').getInstance();

  program
    .version(version)
    .option('-h, --host <host>', 'hostname (default: 0.0.0.0)')
    .option('-p, --port <port>', 'port (default: 6644)')
    .option('-s, --socket <file>', 'unix domain socket file')
    .option('-f, --file <file>', 'output logs to a file')
    .option('-nc, --no-color', 'output logs to standard output without colors')
    .option('-v, --verbose', 'be verbose')
    .parse(process.argv);

  if (program.args.length > 2) {
    program.outputHelp();
    process.exit(1);
    return;
  }

  program.host = program.host || '0.0.0.0';
  program.port = program.port || 6644;


  verbose = program.verbose;
  logConfig({
    level: verbose ? 'debug' : 'info',
    file: program.file,
    noColor: program.noColor,
    session: session
  });

  if (program.socket) {
    server = new UnixSocketServer({
      socket: program.socket
    });
  } else {
    server = new UnixSocketServer({
      host: program.host,
      port: program.port
    });
  }

  function processRequest(client, jsonConfig, transform) {
    var configId = jsonConfig.bundleName || 'none';
    var start = new Date();
    logger.debug('requested');
    Promise
      .try(function() {
        return configCache.get(jsonConfig);
      })
      .then(function(config) {
        return new Promise(function(resolve, reject) {
          var response = pipeline
            .obj(
              config.process(),
              transform(),
              filter.createResponse()
            )
            .on('error', reject)
            .on('finish', function() {
              response.pipe(client);
              resolve();
            });
        });
      })
      .then(function() {
        var cacheConfig = session.get('cacheConfig');
        var cacheStream = session.get('cacheStream');
        logger.log('info', util.format('done in %sms', new Date() - start), {
          post: cacheConfig && cacheStream ? 'from cache' : ''
        });
      })
      .catch(function(error) {
        logger.error('\n%s', error.stack);
        filter
          .createErrorResponse(error)
          .pipe(client);
      });
  }

  var rid = 0;
  server.on('code', function(client, jsonConfig) {
    session.run(function() {
      session.set('requestId', ++rid);
      session.set('bundleName', jsonConfig.bundleName || 'none');
      processRequest(client, jsonConfig, filter.code);
    });
  });
  server.on('sourcemaps', function(client, jsonConfig) {
    session.run(function() {
      session.set('requestId', ++rid);
      session.set('bundleName', jsonConfig.bundleName || 'none');
      processRequest(client, jsonConfig, filter.sourcemaps);
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
      var addr = server.address();
      if (typeof addr === 'object') {
        addr = addr.address + ':' + addr.port;
      }
      logger.info('service listening to %s', addr);
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
