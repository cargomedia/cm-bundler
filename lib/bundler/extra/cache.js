var path = require('path');
var EventEmitter = require('events');
var through = require('through2');
var deap = require('deap');

/**
 * Inspired by https://github.com/substack/watchify
 */

module.exports = {

  _options: {
    cache: {}
  },

  _states: {
    changingDeps: {},
    updating: false,
    pending: false
  },

  _emitter: new EventEmitter(),

  _delay: 100,

  /**
   * @returns {Object} browserify options
   */
  prepare: function() {
    return this._options;
  },

  /**
   * @param {Browserify} browserify
   * @returns {Browserify}
   */
  process: function(browserify) {
    var states = this._states;
    var options = this._options;
    var emitter = this._emitter;

    var browserifyUpdate = function(deps) {
      browserify.emit('update', deps);
    };

    browserify.pipeline.get('deps').push(through.obj(function(row, enc, next) {
      var file = row.expose ? b._expose[row.id] : row.file;
      options.cache[file] = {
        source: row.source,
        deps: deap.clone(row.deps)
      };
      this.push(row);
      next();
    }));

    browserify.on('bundle', function(bundle) {
      states.updating = true;
      bundle.on('error', onend);
      bundle.on('end', onend);
      function onend() {
        emitter.removeListener('update', browserifyUpdate);
        states.updating = false
      }
    });

    emitter.on('update', browserifyUpdate);

    return browserify;
  },

  invalidate: function(id) {
    var states = this._states;
    var options = this._options;
    var delay = this._delay;
    var emitter = this._emitter;

    if (options.cache) {
      delete options.cache[id];
    }

    states.changingDeps[id] = true;

    var notify = function() {
      if (states.updating) {
        states.pending = setTimeout(notify, delay);
      } else {
        states.pending = false;
        emitter.emit('update', Object.keys(states.changingDeps));
        states.changingDeps = {};
      }
    };

    if (states.pending) {
      clearTimeout(states.pending);
    }
    states.pending = setTimeout(notify, delay);
  }
}
;
