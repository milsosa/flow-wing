import createDebug from 'debug';
import * as Utils from '../utils';
import VError from 'verror';
import { Task, Runtime, FlowOptions, RunnerResult } from '../types';

function runTasks(tasks: Task[], runtime: Runtime, flowOpts: FlowOptions): Promise<RunnerResult> {
  const debug = createDebug(`flow-wing{${flowOpts.name}}:runner:parallel`);
  const tasksIterator = tasks[Symbol.iterator]();
  const { concurrency = Infinity } = flowOpts;
  const results: Record<string, any> = {};
  const errors: VError[] = [];
  let aborted = false;
  let running = 0;
  let index = 0;
  let onComplete: (result: RunnerResult) => void;
  let onError: (error: VError) => void;

  function next() {
    if (aborted) {
      return;
    }

    const { value: task, done } = tasksIterator.next();

    if (done) {
      if (running === 0 && !aborted) {
        onComplete({ results, errors });
      }
      return;
    }

    const taskID = task.id || String(index);
    const passRuntime = task.flowAsTask;

    running += 1;
    index += 1;

    if (running < concurrency) {
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

  return new Promise<RunnerResult>((resolve, reject) => {
    onComplete = resolve;
    onError = reject;

    next();
  });
}

function run(tasks: Task[], runtime: Runtime, flowOpts: FlowOptions): Promise<RunnerResult> {
  if (tasks.length === 0) {
    return Promise.resolve({ results: {}, errors: [] });
  }

  return runTasks(tasks, runtime, flowOpts);
}

export default { run };
