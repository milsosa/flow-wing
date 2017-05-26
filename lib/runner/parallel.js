'use strict';

const Bluebird = require('bluebird');
const createDebug = require('debug');
const Utils = require('../utils');

module.exports = {
  run(tasks, runtime, flowOpts) {
    const debug = createDebug(`flow-wing{${flowOpts.name}}:runner:parallel`);
    const results = {};
    const errors = [];

    debug(`running ${tasks.length} tasks`);

    const promises = Bluebird.map(tasks, (task, index) => {
      const taskID = task.id || index;

      debug('initiating task %s', taskID);

      const taskPromise = task.run(runtime.context)
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

        return flowOpts.abortOnError ? taskPromise : taskPromise.reflect();
    }, { concurrency: flowOpts.concurrency });

    return Bluebird.all(promises)
      .then(() => ({ errors, results }));
  }
};
