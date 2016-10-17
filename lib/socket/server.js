var fs = require('fs');
var net = require('net');
var util = require('util');
var EventEmitter = require('events');

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
      client.on('data', self._onData.bind(self, client));
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
  });
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
 * @param {Object} data
 * @protected
 */
UnixSocketServer.prototype._onData = function(client, data) {
  var errorResponse = null;
  try {
    data = JSON.parse(data.toString());
  } catch (error) {
    errorResponse = {error: error};
  }
  if (!data.command) {
    errorResponse = {error: 'Malformed request, "command" not found.'};
  }
  if (!data.config) {
    errorResponse = {error: 'Malformed request, "config" not found.'};
  }

  if (errorResponse) {
    client.write(JSON.stringify(errorResponse));
    client.end();
  } else if (!this.emit(data.command, client, data.config)) {
    client.write(JSON.stringify({error: 'Command "' + data.command + '" not supported.'}));
    client.end();
  }
};

module.exports = UnixSocketServer;
