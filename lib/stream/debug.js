var through = require('through2');
var logger = require('../util/logger');

module.exports = function(log, step) {
  return through.obj(function(file, _, next) {
    this.push(file);
    next();
  }, function(end) {
    var now = Date.now();
    logger.debug(log, now - step);
    step.setTime(now);
    end();
  });
};
