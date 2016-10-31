var fs = require('fs');
var net = require('net');
var util = require('util');
var EventEmitter = require('events');
var _ = require('underscore');
/**
 * @class UnixSocketServer
 * @extends EventEmitter
 *
 * @param {String} path
 */
function UnixSocketServer(path) {
  EventEmitter.call(this);
  this._path = path;
  this._server = null;
}

util.inherits(UnixSocketServer, EventEmitter);

/**
 * @returns {Promise}
 */
UnixSocketServer.prototype.start = function() {
  var self = this;
  var path = this._path;
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
      fs.unlink(path, function(error) {
        self.emit('error', error);
      });
    });
    self._server.on('error', function(error) {
      reject(error);
    });

    self._server.listen(path);
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
 * @param {Stream} client
 * @param {String} request
 * @protected
 */
UnixSocketServer.prototype._onData = function(client, request) {
  var errorResponse = null;
  try {
    request = JSON.parse(request);
  } catch (error) {
    errorResponse = {error: error, request: request};
  }
  if (!request.command) {
    errorResponse = {error: 'Malformed request, "command" not found.', request: request};
  }
  if (!request.config) {
    errorResponse = {error: 'Malformed request, "config" not found.', request: request};
  }

  if (errorResponse) {
    client.end(JSON.stringify(errorResponse));
  } else if (!this.emit(request.command, client, request.config)) {
    client.end(JSON.stringify({error: 'Command "' + request.command + '" not supported.'}));
  }
};

module.exports = UnixSocketServer;
