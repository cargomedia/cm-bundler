var util = require('util');
var winston = require('winston');
var colors = require('colors/safe');
var helper = require('../helper');
var _ = require('underscore');

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

  config = _.defaults(config || {}, {
    file: null,
    level: 'error',
    noColor: false,
    session: null
  });

  winston.level = config.level;
  winston.remove(winston.transports.Console);
  winston.add(winston.transports.Console, {
    formatter: function(options) {
      var requestId = config.session && config.session.get('requestId');
      var bundleConfig = config.session && config.session.get('config');
      var timestamp = (new Date()).toISOString();

      var colorLevel = colors[levelColors[options.level] || 'grey'];
      var colorRequest = colors.blue;
      var colorBundleName = function() {
        return colors.white(colors.bold.apply(colors, arguments))
      };
      var colorMessage = 'error' === options.level ? colors.red : colors.reset;

      if ('number' === typeof requestId) {
        colorRequest = colors[requestColors[requestId % 5]];
        requestId = helper.paddingLeft(requestId, 5, '0');
      }

      var level = helper.paddingLeft(options.level, 5);
      var bundleName = bundleConfig ? helper.paddingRight(bundleConfig.name(), 32) + ' ' : '';
      var bundleId = bundleConfig ? bundleConfig.id() : '';

      var pre = util.format('%s', timestamp);
      var req = util.format(' %s', requestId);
      var message = options.message ? options.message : '';
      var post = options.meta && options.meta.post ? util.format('(%s)', options.meta.post) : '';

      if (bundleConfig) {
        req += ':' + bundleId.substr(0, 6);
      }

      if (config.noColor) {
        return util.format('[%s%s %s] %s%s %s',
          pre, req, level, (bundleName || ''), message, post
        );
      } else {
        return util.format('[%s%s %s] %s%s %s',
          colors.grey(pre), colorRequest(req), colorLevel(level), colorBundleName(bundleName || ''), colorMessage(message), colors.grey(post)
        );
      }
    }
  });

  if (config.file) {
    winston.add(winston.transports.File, {
      filename: config.file
    });
  }
};
