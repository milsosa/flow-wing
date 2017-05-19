'use strict';

const prettyPrint = require('./pretty-print');

function tapLog(label) {
  return (ctx, result) => {
    prettyPrint(`${label} ctx:`, ctx);
    prettyPrint(`${label} result:`, result);
    return result;
  }
}

module.exports = tapLog;
