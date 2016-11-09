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
  var configCache = require('../lib/bundler/config/cache').getInstance();

  var _ = require('underscore');
  var util = require('util');
  var program = require('commander');
  var pipeline = require('pumpify');
  var Promise = require('bluebird');
  var logger = require('../lib/util/logger');
  var config = require('../lib/config');
  var logConfig = require('../lib/util/logger/config');


  program
    .version(require('../package.json').version)
    .option('-H, --host <host>', 'hostname (default: 0.0.0.0)')
    .option('-p, --port <port>', 'port (default: 6644)')
    .option('-c, --config <file>', 'config file (JSON format)')
    .option('-s, --socket <file>', 'unix domain socket file')
    .option('-l, --log-file <file>', 'output logs to a file')
    .option('-C, --no-color', 'output logs to standard output without colors')
    .option('-v, --verbose', 'be verbose')
    .option('-M, --more-verbose', 'be more verbose')
    .parse(process.argv);

  if (program.args.length > 2) {
    program.outputHelp();
    process.exit(1);
    return;
  }

  if (program.config) {
    config.require(program.config);
  }
  config.merge({
    bundler: {
      port: program.port || config.get('bundler.port'),
      host: program.host || config.get('bundler.host'),
      socket: program.socket || config.get('bundler.socket')
    },
    log: {
      file: program.logFile || config.get('log.file'),
      level: (program.verbose || program.moreVerbose) ? 'debug' : config.get('log.level'),
      color: !_.isUndefined(program.color) ? program.color : config.get('bundler.socket')
    }
  });

  logConfig(config.get('log'));

  verbose = program.verbose || program.moreVerbose;

  var bundler = require('../lib/bundler');
  var filter = require('../lib/stream/filter');
  var UnixSocketServer = require('../lib/socket/server');
  var BundleConfig = require('../lib/bundler/config');

  if (config.get('bundler.socket')) {
    server = new UnixSocketServer({
      socket: config.get('bundler.socket')
    });
  } else {
    server = new UnixSocketServer({
      host: config.get('bundler.host'),
      port: config.get('bundler.port')
    });
  }

  var rid = 0;

  /**
   * @param {Socket} client
   * @param {BundleConfig~config} jsonConfig
   * @param {Transform} transform
   */
  function processRequest(client, jsonConfig, transform) {
    var bundleConfig = new BundleConfig(
      jsonConfig, null, config.get('bundler.timeout'), config.get('bundler.updateDelay')
    );

    session.set('requestId', ++rid);
    session.set('config', bundleConfig);
    logger.debug('requested');

    var start = new Date();
    Promise
      .try(function() {
        return configCache.get(bundleConfig);
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

    server.on('code', function(client, jsonConfig) {
      session.run(function() {
        processRequest(client, jsonConfig, filter.code);
      });
    });

    server.on('sourcemaps', function(client, jsonConfig) {
      session.run(function() {
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
