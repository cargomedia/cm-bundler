var extend = require('xtend');

module.exports = function(defaultConfig) {
  if(process.argv.length < 3) {
    throw new Error('JSON argument required, check the doc.');
  }
  try  {
    var config = extend(defaultConfig, JSON.parse(process.argv[2]));
  } catch(e) {
    throw new Error('JSON argument required, check the doc.');
  }
  return config;
};
