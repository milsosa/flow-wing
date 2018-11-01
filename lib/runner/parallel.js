'use strict';

const createDebug = require('debug');
const Utils = require('../utils');

function runTasks(tasks, runtime, flowOpts) {
  const debug = createDebug(`flow-wing{${flowOpts.name}}:runner:parallel`);
  const tasksIterator = tasks[Symbol.iterator]();
  const { concurrency } = flowOpts;
  const results = {};
  const errors = [];
  let aborted = false;
  let running = 0;
  let index = 0;
  let onComplete;
  let onError;

  function next() {
    if (aborted) {
      return;
    }

    const { value: task, done } = tasksIterator.next();

    if (done && running > 0) {
      return;
    }

    if (done && running === 0 && !aborted) {
      return onComplete({ results, errors });
    }

    const taskID = task.id || index;
    const passRuntime = task.flowAsTask;

    running += 1;
    index += 1;

    if (!done && running < concurrency && !aborted) {
      next();
    }

    debug('initiating task %s', taskID);

    task.run(runtime.context, passRuntime ? runtime : undefined)
      .then(result => {
        debug('task %s finished successfully', taskID);
        results[taskID] = result;
        running -= 1;

        next();
      })
      .catch(error => {
        debug('task %s has failed due to: %s', taskID, error.message);

        running -= 1;
        const taskError = Utils.buildTaskError(error, taskID, flowOpts);

        if (flowOpts.abortOnError) {
          aborted = true;
          onError(taskError);
        } else {
          debug('continuing tasks execution because abortOnError=%s', flowOpts.abortOnError);
          results[taskID] = undefined;
          errors.push(taskError);
          next();
        }
      });
  }

  debug(`running ${tasks.length} tasks`);

  return new Promise((resolve, reject) => {
    onComplete = resolve;
    onError = reject;

    next();
  });
}

module.exports = {
  run(tasks, runtime, flowOpts) {
    if (tasks.length === 0) {
      return Promise.resolve({ results: {}, errors: [] });
    }

    return runTasks(tasks, runtime, flowOpts);
  }
};
