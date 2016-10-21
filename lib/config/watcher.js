var logger = require('../util/logger');
var fs = require('graceful-fs');
var Promise = require('bluebird');
var EventEmitter = require('events').EventEmitter;
var inherits = require('inherits');
var chokidar = require('chokidar');
var hash = require('../util/hash');

/**
 * @class ConfigWatcher
 * @param {String[]} patterns
 */
function ConfigWatcher(patterns) {
  EventEmitter.call(this);
  this._patterns = patterns;
  this._hashFiles = {};
  this._watcher = chokidar.watch(null, {
    alwaysStat: true
  });
}

ConfigWatcher.prototype = {

  /**
   * @returns {Promise}
   */
  initialize: function() {
    var self = this;
    var watcher = this._watcher;
    var patterns = this._patterns;
    this._listenToChanges();
    return Promise
      .try(function() {
        return self._watch(patterns);
      })
      .then(function() {
        watcher.on('all', function() {
          self.emit('update');
        });
    });
  },

  /**
   * @returns {String}
   */
  getHash: function() {
    return hash.md5(this._hashFiles);
  },

  /**
   * @param {String[]} patterns
   * @returns {Promise}
   * @protected
   */
  _watch: function(patterns) {
    var watcher = this._watcher;
    return new Promise(function(resolve, reject) {
      watcher.add(patterns);
      watcher.on('ready', resolve);
      watcher.on('error', reject);
    });
  },

  /**
   * @private
   */
  _listenToChanges: function() {
    var hashFiles = this._hashFiles;
    this._watcher.on('add', function(path, info) {
      hashFiles[path] = hash.md5(info);
    });
    this._watcher.on('change', function(path, info) {
      hashFiles[path] = hash.md5(info);
    });
    this._watcher.on('unlink', function(path) {
      delete hashFiles[path];
    });
  }
};

ConfigWatcher.prototype.constructor = ConfigWatcher;
inherits(ConfigWatcher, EventEmitter);


module.exports = ConfigWatcher;
