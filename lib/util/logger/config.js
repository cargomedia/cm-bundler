var util = require('util');
var winston = require('winston');
var colors = require('colors/safe');

var levelColors = {
  error: 'red',
  warn: 'yellow',
  help: 'cyan',
  data: 'grey',
  info: 'green',
  debug: 'blue',
  prompt: 'grey',
  verbose: 'cyan',
  input: 'grey',
  silly: 'magenta'
};

/**
 * @typedef {Object} Logger~config
 * @property {String|null} file
 * @property {String} level
 * @property {Boolean} noColor
 * @property {Namespace} session
 */

/**
 * @param {logger~config} config
 */
module.exports = function configure(config) {
  winston.level = config.level;
  winston.remove(winston.transports.Console);
  winston.add(winston.transports.Console, {
    formatter: function(options) {
      var requestId = config.session && config.session.get('requestId');
      var bundleName = config.session && config.session.get('bundleName');
      var timestamp = (new Date()).toISOString();

      var color = !config.noColor;
      var pre = util.format('[%s', timestamp);
      var req = (requestId ? util.format(' %s ', requestId) : ' ');
      var level = options.level;
      var message = options.message ? options.message : '';
      var post = bundleName ? util.format(' (%s)', bundleName) : '';

      var requestColors = ['green', 'yellow', 'blue', 'magenta', 'cyan'];

      return [
        color ? colors.grey(pre) : pre,
        color ? colors[requestColors[req % 5]](req) : req,
        color ? colors[levelColors[level] || 'grey'](level) : level,
        color ? colors.grey('] ') : '] ',
        color && 'error' === level ? colors.red(message) : message,
        color ? colors.grey(post) : post
      ].join('');
    }
  });

  if (config.file) {
    winston.add(winston.transports.File, {
      filename: config.file
    });
  }
};
