import createDebug from 'debug';
import * as Utils from '../utils';
import VError from 'verror';
import { Task, Runtime, FlowOptions, RunnerResult } from '../types';

function run(tasks: Task[], runtime: Runtime, flowOpts: FlowOptions): Promise<RunnerResult> {
  const debug = createDebug(`flow-wing{${flowOpts.name}}:runner:${flowOpts.mode}`);
  const results: Record<string, any> = {};
  const errors: VError[] = [];

  let skipPending = false;
  const pipeResult = runtime.opts.piped || runtime.opts.mode === 'waterfall';

  debug(`running ${tasks.length} tasks`);

  const promises = tasks.reduce((promise, task, index) => {
    const taskID = task.id || String(index);
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
      .then(result => {
        debug('task %s finished successfully', taskID);
        results[taskID] = result;

        return result;
      })
      .catch(error => {
        if (skipPending) {
          throw error;
        }

        debug('task %s has failed due to: %s', taskID, error.message);

        skipPending = !!flowOpts.abortOnError;
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

export default { run };
