'use strict';

import debugLib from 'debug';
import VError from 'verror'; // Ensure VError is imported
import Utils from '../utils';

function runTasks(tasks: any[], runtime: any, flowOpts: any) {
  const debug = debugLib(`flow-wing{${flowOpts.name}}:runner:parallel`);
  const tasksIterator = tasks[Symbol.iterator]();
  const { concurrency } = flowOpts;
  const results = {};
  const errors: VError[] = []; // Explicitly type errors array if it only holds VErrors
  let aborted = false;
  let running = 0;
  let index = 0;
  // Ensure onComplete and onError are typed to match the Promise constructor
  let onComplete: (value: { results: any; errors: VError[] }) => void;
  let onError: (reason?: VError) => void;

  function next() {
    if (aborted) {
      return;
    }

    const { value: task, done } = tasksIterator.next();

    if (done && running > 0) {
      return;
    }

    if (done && running === 0 && !aborted) {
      // Ensure the object passed to onComplete matches its new signature
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

    (task.run(runtime.context, passRuntime ? runtime : undefined) as Promise<any>)
      .then((result: any) => {
        debug('task %s finished successfully', taskID);
        results[taskID] = result;
        running -= 1;

        next();
      })
      .catch((error: any) => { // Catch error as 'any' initially
        debug('task %s has failed due to: %s', taskID, error.message);

        running -= 1;
        const taskError: VError = Utils.buildTaskError(error, taskID, flowOpts);

        if (flowOpts.abortOnError) {
          aborted = true;
          if (onError) onError(taskError); // Call onError if defined
        } else {
          debug('continuing tasks execution because abortOnError=%s', flowOpts.abortOnError);
          results[taskID] = undefined;
          errors.push(taskError);
          next();
        }
      });
  }

  debug(`running ${tasks.length} tasks`);

  // Update Promise generic type to match onComplete and onError
  return new Promise<{ results: any; errors: VError[] }>((resolve, reject) => {
    onComplete = resolve;
    onError = reject; // reject is (reason?: VError) => void due to Promise generic
    next();
  });
}

function run(tasks: any[], runtime: any, flowOpts: any): Promise<{ results: any; errors: VError[] }> {
  if (tasks.length === 0) {
    return Promise.resolve({ results: {}, errors: [] });
  }
  return runTasks(tasks, runtime, flowOpts);
}

export default {
  run
};
