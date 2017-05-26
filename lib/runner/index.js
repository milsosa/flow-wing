'use strict';

const Serial = require('./serial');
const Parallel = require('./parallel');

module.exports = {
  series(tasks, runtime, flowOpts) {
    return Serial.run(tasks, runtime, flowOpts);
  },

  waterfall(tasks, runtime, flowOpts) {
    return Serial.run(tasks, runtime, flowOpts);
  },

  parallel(tasks, runtime, flowOpts) {
    return Parallel.run(tasks, runtime, flowOpts);
  }
};
