var fs = require('fs');
var through = require('through2');
var deap = require('deap');

var marks = [];
var init = new Date();
var globalOptions = {
  enabled: false,
  output: null
};

var bench = {

  /**
   * @param {String} mark
   * @returns {DestroyableTransform}
   */
  mark: function(mark) {
    return through.obj(read);

    function read(data, encoding, next) {
      bench.addMark(mark);
      this.push(data);
      next();
    }
  },

  /**
   * @param {String} mark
   */
  addMark: function(mark) {
    if (globalOptions.enabled) {
      marks.push({
        mark: mark,
        timestamp: new Date()
      });
    }
  },

  /**
   * @returns {DestroyableTransform}
   */
  log: function() {
    return through.obj(read, flush);

    function read(data, encoding, next) {
      this.push(data);
      next();
    }

    function flush() {
      if (globalOptions.enabled && globalOptions.output) {
        var stream = fs.createWriteStream(globalOptions.output);
        var reports = {};
        stream.on('open', function() {
          bench.addMark('end');
          marks.forEach(function(entry, index, entries) {
            var previousTimestamp = index > 0 ? entries[index - 1].timestamp : init;
            var duration = entry.timestamp.getTime() - previousTimestamp.getTime();
            reports[entry.mark] = reports[entry.mark] ? reports[entry.mark] + duration : duration;
          });
          for (var report in reports) {
            stream.write(report + ': ' + reports[report] / 1000 + "s\n");
          }
          stream.end();
        });
      }
    }
  }
};

/**
 * @param {{enabled: Boolean, output: String}} options
 * @returns {{mark: bench.mark, addMark: bench.addMark, log: bench.log}}
 */
module.exports = function(options) {
  deap(globalOptions, options || {});
  return bench;
};
