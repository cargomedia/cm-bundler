var util = require('util');
var winston = require('winston');
var colors = require('colors/safe');
var helper = require('../helper');

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
var requestColors = ['green', 'yellow', 'blue', 'magenta', 'cyan'];


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
      var requestColor = 'blue';
      var timestamp = (new Date()).toISOString();

      if ('number' === typeof requestId) {
        requestColor = requestColors[requestId % 5];
        requestId = helper.padding(requestId, 6);
      }

      var color = !config.noColor;
      var pre = util.format('[%s', timestamp);
      var req = (requestId ? util.format(' %s ', requestId) : ' ');
      var level = options.level;
      var message = options.message ? options.message : '';
      var post = options.meta && options.meta.post ? options.meta.post : bundleName;
      post = post ? util.format(' (%s)', post) : '';

      return [
        color ? colors.grey(pre) : pre,
        color ? colors[requestColor](req) : req,
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
