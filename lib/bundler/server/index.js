var util = require('util');
var logger = require('../../util/logger');
var session = require('../../session');
var pipeline = require('pumpify');
var Promise = require('bluebird');
var Validator = require('jsonschema').Validator;


var config = require('../../config');
var bundler = require('./../index');
var filter = require('../../stream/filter');
var UnixSocketServer = require('../../socket/server');

var configCache = require('./../config/cache').getInstance();
var BundleConfig = require('./../config');


/**
 * @class BundlerServer
 * @extends UnixSocketServer
 *
 * @param {UnixSocketServer~config} config
 */
function BundlerServer(config) {
  this._requestId = 0;
  this._validator = new Validator();
  this._configure();
  UnixSocketServer.call(this, config);
}

util.inherits(BundlerServer, UnixSocketServer);

BundlerServer.prototype.start = function() {
  var self = this;

  this.on('code', function(client, name, jsonConfig) {
    session.run(function() {
      self._processRequest(client, name, jsonConfig, filter.code);
    });
  });

  this.on('sourcemaps', function(client, name, jsonConfig) {
    session.run(function() {
      self._processRequest(client, name, jsonConfig, filter.sourcemaps);
    });
  });

  return UnixSocketServer.prototype.start.call(this);
};

/**
 * @param {Socket} client
 * @param {String} name
 * @param {BundleConfig~config} jsonConfig
 * @param {Transform} transform
 */
BundlerServer.prototype._processRequest = function(client, name, jsonConfig, transform) {
  var bundleConfig = new BundleConfig(
    jsonConfig,
    name,
    config.get('bundler.baseDir'),
    config.get('bundler.timeout'),
    config.get('bundler.updateDelay')
  );

  session.set('requestId', ++this._requestId);
  session.set('config', bundleConfig);
  logger.debug('requested');

  var start = new Date();
  Promise
    .try(function() {
      return configCache.get(bundleConfig);
    })
    .then(function(config) {
      logger.silly('\n%s', JSON.stringify(config.get(), null, '  '));
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
};

/**
 * @protected
 */
BundlerServer.prototype._configure = function() {
  this._validator.addSchema(require('./schema/request.json'), '/request');
  this._validator.addSchema(require('./schema/config.json'), '/request/config');
};

BundlerServer.prototype._validate = function(request) {
  this._validator.validate(request, '/request', {throwError: true});
  return request;
};


module.exports = BundlerServer;
