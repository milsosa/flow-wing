'use strict';

const createDebug = require('debug');
const Utils = require('./utils');

const debuggers = {};

function customDebug(namespace /*, ...args*/) {
  const debug = debuggers[namespace] || (debuggers[namespace] = createDebug(namespace));

  debug.apply(debug, Utils.restArgs(arguments, 1));
}

exports = module.exports = customDebug;
