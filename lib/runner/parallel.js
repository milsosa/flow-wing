'use strict';

const Bluebird = require('bluebird');
const createDebug = require('debug');
const Utils = require('../utils');

module.exports = {
  run(tasks, ctx, runOpts) {
    const debug = createDebug(`flow-wing{${runOpts.name}}:runner:parallel`);
    const results = {};
    const errors = [];

    debug(`running ${tasks.length} tasks`);

    return Bluebird.map(tasks, (task, index) => {
      const taskID = task.id || index;

      debug('initiating task %s', taskID);

      return task.run(ctx)
        .tap(result => {
          debug('task %s finished sucessfully', taskID);
          results[taskID] = result;
        })
        .catch(err => {
          debug('task %s has failed due to: %s', taskID, err.message);

          const error = Utils.buildTaskError(err, taskID, runOpts);

          if (runOpts.abortOnError) {
            throw error;
          } else {
            debug('continuing tasks execution because abortOnError=%s', runOpts.abortOnError);
            results[taskID] = undefined;
            errors.push(error);
          }
        });
    }, { concurrency: runOpts.concurrency })
    .then(() => ({ errors, results }));
  }
};
