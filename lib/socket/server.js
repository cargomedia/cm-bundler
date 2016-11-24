var fs = require('fs');
var net = require('net');
var util = require('util');
var EventEmitter = require('events');
var _ = require('underscore');

/**
 * @typedef {Object} UnixSocketServer~config
 * @property {String} [socket]
 * @property {String} [host=0.0.0.0]
 * @property {Number} [port=6644]
 */


/**
 * @class UnixSocketServer
 * @extends EventEmitter
 *
 * @param {UnixSocketServer~config} config
 */
function UnixSocketServer(config) {
  EventEmitter.call(this);
  this._config = _.defaults(config || {}, {
    port: 6644
  });
  this._server = null;
}

util.inherits(UnixSocketServer, EventEmitter);

/**
 * @returns {Promise}
 */
UnixSocketServer.prototype.start = function() {
  var self = this;
  var config = this._config;
  return new Promise(function(resolve, reject) {
    self._server = net.createServer(function(client) {
      var request = Buffer.from('');

      client.on('data', function(data) {
        request = Buffer.concat([request, data]);
        if (4 /* EOT */ === _.last(request)) {
          self._onData(client, request.toString('utf8', 0, request.length - 1));
          request = Buffer.from('');
        }
      });
    });
    self._server.on('listening', function() {
      resolve(self._server);
    });
    self._server.on('quit', function() {
      if (config.socket) {
        fs.unlink(config.socket, function(error) {
          self.emit('error', error);
        });
      }
    });
    self._server.on('error', function(error) {
      reject(error);
    });

    if (config.socket) {
      self._server.listen(config.socket);
    } else {
      self._server.listen(config.port, config.host);
    }
  }, {});
};

UnixSocketServer.prototype.stop = function() {
  if (this._server) {
    this.emit('stop');
    this._server.close();
    this._server.unref();
    this._server = null;
  }
};

/**
 * @param {String} request
 * @returns {String}
 * @protected
 */
UnixSocketServer.prototype._parse = function(request) {
  return JSON.parse(request);
};

/**
 * @param {String} request
 * @returns {String}
 * @protected
 */
UnixSocketServer.prototype._validate = function(request) {
  return request;
};

/**
 * @param {Stream} client
 * @param {String} request
 * @protected
 */
UnixSocketServer.prototype._onData = function(client, request) {
  var errorResponse = null;
  try {
    request = this._validate(
      this._parse(request)
    );
  } catch (error) {
    errorResponse = {error: error.message, request: request};
  }

  if (errorResponse) {
    client.end(JSON.stringify(errorResponse));
  } else if (!this.emit(request.command, client, request.name, request.config)) {
    client.end(JSON.stringify({error: 'Command "' + request.command + '" not supported.'}));
  }
};

module.exports = UnixSocketServer;
