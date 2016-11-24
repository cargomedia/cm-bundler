#!/usr/bin/env node
var logLevel = 'debug';
var verboseLevel = ['error', 'info', 'debug', 'silly'];
var server = null;
var logger = null;


try {
  process.on('SIGINT', function() {
    abort(null, 2);
  });
  process.on('SIGTERM', function() {
    abort();
  });


  function increaseVerbosity(v, total) {
    return total + 1 < verboseLevel.length ? total + 1 : total;
  }

  var _ = require('underscore');
  var program = require('commander');
  var session = require('../lib/session');
  var config = require('../lib/config');
  var logConfig = require('../lib/util/logger/config');
  var BundlerServer = require('../lib/bundler/server');

  program
    .version(require('../package.json').version)
    .option('-H, --host <host>', 'hostname (default: 127.0.0.1)')
    .option('-p, --port <port>', 'port (default: 6644)')
    .option('-b, --base-dir <dir>', 'base directory')
    .option('-c, --config <file>', 'config file (JSON format)')
    .option('-s, --socket <file>', 'unix domain socket file')
    .option('-l, --log-file <file>', 'output logs to a file')
    .option('-C, --no-color', 'output logs to standard output without colors')
    .option('-v, --verbose', 'be verbose (-v,-vv,-vvv)', increaseVerbosity, 0)
    .parse(process.argv);

  if (program.args.length > 2) {
    program.outputHelp();
    process.exit(1);
    return;
  }

  if (program.config) {
    config.require(program.config);
  }

  logLevel = program.verbose > 0 ? verboseLevel[program.verbose] : config.get('log.level');
  config.merge({
    bundler: {
      port: program.port || config.get('bundler.port'),
      host: program.host || config.get('bundler.host'),
      socket: program.socket || config.get('bundler.socket'),
      baseDir: program.baseDir || config.get('bundler.baseDir'),
    },
    log: {
      file: program.logFile || config.get('log.file'),
      color: !_.isUndefined(program.color) ? program.color : config.get('bundler.socket'),
      level: logLevel,
    }
  });

  logConfig(config.get('log'));

  session.run(function() {
    var logger = require('../lib/util/logger');

    session.set('requestId', 'service');

    if (config.get('bundler.socket')) {
      server = new BundlerServer({
        socket: config.get('bundler.socket')
      });
    } else {
      server = new BundlerServer({
        host: config.get('bundler.host'),
        port: config.get('bundler.port')
      });
    }

    session.bindEmitter(server);
    server.on('error', function(error) {
      server.stop();
      abort(error);
    });

    server.on('stop', function(error) {
      logger.info('stopping...');
    });

    server
      .start()
      .then(function(server) {
        var addr = server.address();
        if (typeof addr === 'object') {
          addr = addr.address + ':' + addr.port;
        }
        logger.info('listening to %s', addr);
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
    logError('debug' === logLevel ? error.stack : 'Error: ' + error.message);
    process.exit(1);
  } else if (signal) {
    process.exit(signal + 128);
  }
}
