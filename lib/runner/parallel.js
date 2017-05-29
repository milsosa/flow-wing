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
          debug('task %s finished sucessfully', taskID);
          results[taskID] = result;
        })
        .catch(err => {
          debug('task %s has failed due to: %s', taskID, err.message);

          const error = Utils.buildTaskError(err, taskID, flowOpts);

          if (flowOpts.abortOnError) {
            throw error;
          } else {
            debug('continuing tasks execution because abortOnError=%s', flowOpts.abortOnError);
            results[taskID] = undefined;
            errors.push(error);
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
