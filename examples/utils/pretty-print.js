'use strict';

const util = require('util');

function prettyPrint(label, data) {
  console.log(`${label} `, util.inspect(data, { depth: 3 }));
}

module.exports = prettyPrint;
