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
        if (skipPending) {
          debug('skipping pending tasks due to an error');
          return promise;
        }

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
        .catch(err => {
          if (skipPending) {
            throw err;
          }

          debug('task %s has failed due to: %s', taskID, err.message);

          skipPending = flowOpts.abortOnError;
          const error = Utils.buildTaskError(err, taskID, flowOpts);

          if (flowOpts.abortOnError) {
            throw error;
          } else {
            debug('continuing tasks execution because abortOnError=%s', flowOpts.abortOnError);
            results[taskID] = undefined;
            errors.push(error);
          }
        });
    }, Promise.resolve(runtime.previousResult));

    return promises
      .then(() => ({ errors, results }));
  }
};
