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

  var session = require('../lib/session');
  var configCache = require('../lib/config/cache').getInstance();


  var util = require('util');
  var program = require('commander');
  var pipeline = require('pumpify');

  var logger = require('../lib/util/logger');
  var logConfig = require('../lib/util/logger/config');

  program
    .version(require('../package.json').version)
    .option('-h, --host <host>', 'hostname (default: 0.0.0.0)')
    .option('-p, --port <port>', 'port (default: 6644)')
    .option('-s, --socket <file>', 'unix domain socket file')
    .option('-f, --file <file>', 'output logs to a file')
    .option('-nc, --no-color', 'output logs to standard output without colors')
    .option('-v, --verbose', 'be verbose')
    .option('-vv, --more-verbose', 'be more verbose')
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

  var bundler = require('../lib/bundler');
  var filter = require('../lib/stream/filter');
  var UnixSocketServer = require('../lib/socket/server');
  var BundleConfig = require('../lib/config');

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

  /**
   * @param {Socket} client
   * @param {BundleConfig} config
   * @param {Transform} transform
   */
  function processRequest(client, config, transform) {
    logger.debug('requested');
    var start = new Date();
    Promise
      .try(function() {
        return configCache.get(config);
      })
      .then(function(config) {
        if (program.moreVerbose) {
          logger.debug('\n%s', JSON.stringify(config.get(), null, '  '));
        }
        return new Promise(function(resolve, reject) {
          var build = pipeline.obj(
            config.process(),
            transform(),
            filter.createResponse()
          );
          session.bindEmitter(build);

          build
            .on('error', reject)
            .on('finish', function() {
              var response = build.pipe(client).on('finish', resolve);
              session.bindEmitter(response);
              response
                .on('error', function(error) {
                  logger.error('\n%s', error.stack);
                });
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
        var errorResponse = filter.createErrorResponse(error).pipe(client);
        session.bindEmitter(errorResponse);
        errorResponse.on('error', function(error) {
          logger.error('\n%s', error.stack);
        });
      });
  }


  session.run(function() {
    session.set('requestId', 'server');
    session.bindEmitter(server);

    var rid = 0;

    server.on('code', function(client, jsonConfig) {
      session.run(function() {
        var config = new BundleConfig(jsonConfig);
        session.set('requestId', ++rid);
        session.set('config', config);
        processRequest(client, config, filter.code);
      });
    });

    server.on('sourcemaps', function(client, jsonConfig) {
      session.run(function() {
        var config = new BundleConfig(jsonConfig);
        session.set('requestId', ++rid);
        session.set('config', config);
        processRequest(client, config, filter.sourcemaps);
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
  });

} catch (error) {
  abort(error);
}

function abort(error, signal) {
  if (server) {
    server.stop();
  }
  if (error) {
    var logError = logger ? logger.error : console.error;
    logError(verbose ? error.stack : 'Error: ' + error.message);
    process.exit(1);
  } else if (signal) {
    process.exit(signal + 128);
  }
}
