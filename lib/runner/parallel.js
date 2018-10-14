'use strict';

const Promise = require('bluebird');
const createDebug = require('debug');
const Utils = require('../utils');

module.exports = {
  run(tasks, runtime, flowOpts) {
    const debug = createDebug(`flow-wing{${flowOpts.name}}:runner:parallel`);
    const results = {};
    const errors = [];

    debug(`running ${tasks.length} tasks`);

    const promises = Promise.map(tasks, (task, index) => {
      const taskID = task.id || index;
      const passRuntime = task.flowAsTask;

      debug('initiating task %s', taskID);

      const taskPromise = task.run(runtime.context, passRuntime ? runtime : undefined)
        .tap(result => {
          debug('task %s finished successfully', taskID);
          results[taskID] = result;
        })
        .catch(error => {
          debug('task %s has failed due to: %s', taskID, error.message);

          const taskError = Utils.buildTaskError(error, taskID, flowOpts);

          if (flowOpts.abortOnError) {
            throw taskError;
          } else {
            debug('continuing tasks execution because abortOnError=%s', flowOpts.abortOnError);
            results[taskID] = undefined;
            errors.push(taskError);
          }
        });

      // When flowOpts.abortOnError=false return the promise.reflect() so that
      // Promise.all(promises) below waits for all the promises to settle
      // even though one or more of them are rejected
      return flowOpts.abortOnError ? taskPromise : taskPromise.reflect();
    }, { concurrency: flowOpts.concurrency });

    return Promise.all(promises)
      .then(() => ({ errors, results }));
  }
};
