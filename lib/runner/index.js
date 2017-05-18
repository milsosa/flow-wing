'use strict';

const debug = require('../debug');
const Serial = require('./serial');
const Parallel = require('./parallel');

module.exports = {
  series(tasks, ctx, initialValue, runOpts) {
    debug(`flow{${runOpts.name}}:runner:series`, `running ${tasks.length} tasks in series`);
    return Serial.run(tasks, ctx, runOpts, initialValue);
  },

  waterfall(tasks, ctx, initialValue, runOpts) {
    debug(`flow{${runOpts.name}}:runner:waterfall`, `running ${tasks.length} tasks in waterfall`);
    return Serial.run(tasks, ctx, runOpts, initialValue);
  },

  parallel(tasks, ctx, initialValue/*ignored*/, runOpts) {
    debug(`flow{${runOpts.name}}:runner:parallel`, `running ${tasks.length} tasks in parallel`);
    return Parallel.run(tasks, ctx, runOpts);
  },
}
