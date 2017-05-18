'use strict';

const Promise = require('bluebird');
const debug = require('../debug');
const Utils = require('../utils');

module.exports = {
  run(tasks, ctx, runOpts) {
    const debugNamespace = `flow{${runOpts.name}}:runner:parallel`;
    const results = {};
    const errors = [];

    return Promise.map(tasks, (task, index) => {
      const taskId = task.id || index;

      debug(debugNamespace, 'initiating task %s', taskId);

      return task.run(ctx)
        .tap((result) => {
          debug(debugNamespace, 'task %s finished sucessfully', taskId)
          results[taskId] = result;
        })
        .catch((cause) => {
          debug(debugNamespace, 'task %s has failed due to: %s', taskId, cause.message);

          const error = Utils.buildError(cause, taskId, runOpts);

          if (runOpts.abortOnError) {
            throw error;
          } else {
            debug(debugNamespace, 'continuing tasks execution because abortOnError=%s', runOpts.abortOnError);
            results[taskId] = undefined;
            errors.push(error);
          }
        });
    }, { concurrency: runOpts.concurrency })
    .then(() => ({ errors, results }));
  },
};
