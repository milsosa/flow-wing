'use strict';

const Promise = require('bluebird');
const debug = require('../debug');
const Utils = require('../utils');

module.exports = {
  run(tasks, ctx, runOpts, initialValue) {
    const debugNamespace = `flow{${runOpts.name}}:runner:${runOpts.type}`;
    const results = {};
    const errors = [];

    let skipPending = false;

    const tasksPromise = tasks.reduce((promise, task, index) => {
      const taskId = task.id || index;

      promise = promise.then((value) => {
          debug(debugNamespace, 'initiating task %s', taskId);

          return task.run(ctx, value);
        })
        .tap((result) => {
          debug(debugNamespace, 'task %s finished sucessfully', taskId)
          results[taskId] = result;
        })
        .catch((cause) => {
          if (skipPending) {
            throw cause;
          }

          debug(debugNamespace, 'task %s has failed due to: %s', taskId, cause.message);

          skipPending = runOpts.abortOnError;
          const error = Utils.buildError(cause, taskId, runOpts);

          if (runOpts.abortOnError) {
            throw error;
          } else {
            debug(debugNamespace, 'continuing tasks execution because abortOnError=%s', runOpts.abortOnError);
            results[taskId] = undefined;
            errors.push(error);
          }
        });

      return promise;
    }, Promise.resolve(initialValue));

    return tasksPromise
      .then(() => ({ errors, results }));
  },
};
