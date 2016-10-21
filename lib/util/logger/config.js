var winston = require('winston');
/**
 * @typedef {Object} Logger~config
 * @property {String|null} file
 * @property {String} level
 * @property {Boolean} noColor
 */

/**
 * @param {logger~config} config
 */
module.exports = function configure(config) {
  winston.level = config.level;
  winston.remove(winston.transports.Console);
  winston.add(winston.transports.Console, {
    timestamp: function() {
      return (new Date()).toISOString();
    },
    colorize: !config.noColor
  });

  if (config.file) {
    winston.add(winston.transports.File, {
      filename: config.file
    });
  }
};
