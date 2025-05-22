'use strict';

import debugLib from 'debug';
import VError from 'verror'; // Ensure VError is imported
import Utils from '../utils';

/**
 * Waterfall and Series Tasks runner
 */
function run(tasks: any[], runtime: any, flowOpts: any): Promise<{ errors: VError[], results: any }> {
  const debug = debugLib(`flow-wing{${flowOpts.name}}:runner:${flowOpts.mode}`);
  const results = {};
  const errors: VError[] = []; // Type errors array

    let skipPending = false;
    const pipeResult = runtime.opts.piped || runtime.opts.mode === 'waterfall';

    debug(`running ${tasks.length} tasks`);

    const promises = tasks.reduce((promise: Promise<any>, task: any, index: number) => {
      const taskID: string | number = task.id || index;
      const passRuntime: boolean = task.flowAsTask;

      return promise.then((value: any) => {
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
        .then((result: any) => {
          debug('task %s finished successfully', taskID);
          results[taskID] = result;

          return result;
        })
        .catch((error: any) => {
          if (skipPending) {
            throw error;
          }

          debug('task %s has failed due to: %s', taskID, error.message);

          skipPending = flowOpts.abortOnError;
          const taskError: VError = Utils.buildTaskError(error, taskID, flowOpts);

          if (flowOpts.abortOnError) {
            throw taskError;
          } else {
            debug('continuing tasks execution because abortOnError=%s', flowOpts.abortOnError);
            results[taskID] = undefined;
            errors.push(taskError);
          }
          return undefined; // Ensure a value is returned for the next .then() in the reduce chain
        });
    }, Promise.resolve<any>(runtime.previousResult));

    return promises
      .then(() => ({ errors, results })); // errors is already VError[]
}

export default {
  run
};
