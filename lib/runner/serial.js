'use strict';

const Promise = require('bluebird');
const createDebug = require('debug');
const Utils = require('../utils');

/**
 * Waterfall and Series Tasks runner
 */
module.exports = {
  run(tasks, ctx, previousResult, runOpts) {
    const debug = createDebug(`flow-wing{${runOpts.name}}:runner:${runOpts.mode}`);
    const results = {};
    const errors = [];

    let skipPending = false;
    const pipeResult = Utils.pipeResult(runOpts);

    debug(`running ${tasks.length} tasks`);

    const tasksPromise = tasks.reduce((promise, task, index) => {
      const taskID = task.id || index;

      promise = promise.then(value => {
        if (skipPending) {
          debug('skipping pending tasks due to an error');
          return promise;
        }

        debug('initiating task %s', taskID);

        return task.run(ctx, pipeResult ? value : undefined);
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

          skipPending = runOpts.abortOnError;
          const error = Utils.buildTaskError(err, taskID, runOpts);

          if (runOpts.abortOnError) {
            throw error;
          } else {
            debug('continuing tasks execution because abortOnError=%s', runOpts.abortOnError);
            results[taskID] = undefined;
            errors.push(error);
          }
        });

      return promise;
    }, Promise.resolve(previousResult));

    return tasksPromise
      .then(() => ({ errors, results }));
  }
};
