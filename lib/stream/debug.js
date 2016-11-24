var through = require('through2');
var logger = require('../util/logger');
var helper = require('../util/helper');


module.exports = function(log, step) {
  return through.obj(function(file, _, next) {
    var now = Date.now();
    logger.debug(helper.paddingRight(log, 16) + '%sms', now - step);
    step.setTime(now);
    this.push(file);
    next();
  });
};
