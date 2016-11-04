var path = require('path');
var _ = require('underscore');
var deap = require('deap');
var config = require('../config.js');

module.exports = {

  /**
   * @param {String} configPath
   */
  require: function(configPath) {
    var extra = null;
    var absConfigPath = !path.isAbsolute(configPath) ? path.join(process.cwd(), configPath) : configPath;
    try {
      extra = require(absConfigPath);
    } catch (error) {
      throw new Error('Failed to load config at ' + configPath);
    }
    if (!_.isObject(extra)) {
      throw new Error('Invalid config at ' + configPath);
    }
    this.merge(extra);
  },

  /**
   * @param {Object} extra
   */
  merge: function(extra) {
    config = deap(config, extra);
  },

  reset: function() {
    config = require('../config.js');
  },

  /**
   * @param {String} [name]
   * @param {*} [defaultValue]
   * @returns {*|null}
   */
  get: function(name, defaultValue) {
    if (_.isUndefined(name)) {
      return deap({}, config);
    }
    var sub = deap({}, config);
    var i, part, parts = name.split('.');
    for (i = 0; i < parts.length; i++) {
      part = parts[i];
      if (part in sub) {
        if (i === parts.length - 1) {
          return sub[part];
        } else {
          sub = sub[part];
        }
      }
    }
    return !_.isUndefined(defaultValue) ? defaultValue : null;
  }
};
