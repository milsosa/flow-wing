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
    const pipeResult = Utils.pipeResult(runtime.opts);

    console.log('runner pipe result', pipeResult);
    console.log('runner previousResult', runtime.previousResult);

    debug(`running ${tasks.length} tasks`);

    const tasksPromise = tasks.reduce((promise, task, index) => {
      const taskID = task.id || index;

      promise = promise.then(value => {
        if (skipPending) {
          debug('skipping pending tasks due to an error');
          return promise;
        }

        debug('initiating task %s', taskID);

        console.log('task running start, with value', pipeResult, value);

        return task.run(runtime.context, pipeResult ? value : undefined);
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

      return promise;
    }, Promise.resolve(runtime.previousResult));

    return tasksPromise
      .then(() => ({ errors, results }));
  }
};
