'use strict';

const Serial = require('./serial');
const Parallel = require('./parallel');

module.exports = {
  series(tasks, ctx, previousResult, runOpts) {
    return Serial.run(tasks, ctx, previousResult, runOpts);
  },

  waterfall(tasks, ctx, previousResult, runOpts) {
    return Serial.run(tasks, ctx, previousResult, runOpts);
  },

  parallel(tasks, ctx, previousResult/* ignored */, runOpts) {
    return Parallel.run(tasks, ctx, runOpts);
  }
};
