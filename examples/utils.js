'use strict';

const util = require('util');

const verboseMatcher = /-v|--verbose/;
const verboseEnabled = process.argv
  .filter(arg => verboseMatcher.test(arg))
  .length > 0;

function prettyPrint(label, data) {
  if (verboseEnabled) {
    console.log(`${label}`, util.inspect(data, { depth: 3 }));
  }
}

function tapLog(label) {
  return (ctx, result) => {
    prettyPrint(`${label} ctx:`, ctx);
    prettyPrint(`${label} result:`, result);
    return result;
  };
}

function getDelayFactor() {
  const args = process.argv;
  const lastArg = args[args.length - 1];

  return parseInt(lastArg, 10) || 100;
}

module.exports = {
  tapLog,
  prettyPrint,
  getDelayFactor
};
