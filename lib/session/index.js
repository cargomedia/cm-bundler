var cls = require('continuation-local-storage');
var Promise = require('bluebird');
var clsPatcher = require('cls-bluebird');
var session = cls.createNamespace('cm-bundler.request.session');
clsPatcher(session);
module.exports = session;
