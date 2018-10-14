'use strict';

const Promise = require('bluebird');
const createDebug = require('debug');
const Utils = require('../utils');

/**
 * Waterfall and Series Tasks runner
 */
module.exports = {
  run(tasks, runtime, flowOpts) {
    const debug = createDebug(`flow-wing{${flowOpts.name}}:runner:${flowOpts.mode}`);
    const results = {};
    const errors = [];

    let skipPending = false;
    const pipeResult = runtime.opts.piped || runtime.opts.mode === 'waterfall';

    debug(`running ${tasks.length} tasks`);

    const promises = tasks.reduce((promise, task, index) => {
      const taskID = task.id || index;
      const passRuntime = task.flowAsTask;

      return promise.then(value => {
        debug('initiating task %s', taskID);

        if (passRuntime) {
          runtime.previousResult = value;
          value = runtime;
        }

        if (!passRuntime && !pipeResult) {
          value = undefined;
        }

        return task.run(runtime.context, value);
      })
        .tap(result => {
          debug('task %s finished sucessfully', taskID);
          results[taskID] = result;
        })
        .catch(error => {
          if (skipPending) {
            throw error;
          }

          debug('task %s has failed due to: %s', taskID, error.message);

          skipPending = flowOpts.abortOnError;
          const taskError = Utils.buildTaskError(error, taskID, flowOpts);

          if (flowOpts.abortOnError) {
            throw taskError;
          } else {
            debug('continuing tasks execution because abortOnError=%s', flowOpts.abortOnError);
            results[taskID] = undefined;
            errors.push(taskError);
          }
        });
    }, Promise.resolve(runtime.previousResult));

    return promises
      .then(() => ({ errors, results }));
  }
};
