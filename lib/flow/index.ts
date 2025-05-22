'use strict';

import partial from 'lodash.partial';
import defaults from 'lodash.defaults';
import isPlainObject from 'lodash.isplainobject';
import createDebug from 'debug';
import map from 'lodash.map';
import Utils from '../utils';
import Runner from '../runner';
import * as Results from './results';
import createRuntime from './runtime';
import Task from './task';

interface FlowFunction {
  (tasks: any, options?: any): any; // Signature for flow(...) itself
  series: (tasks: any, options?: any) => any;
  waterfall: (tasks: any, options?: any) => any;
  parallel: (tasks: any, options?: any) => any;
  Task: any;
}

const defaultOptions = {
  resultsAsArray: true,
  abortOnError: true,
  concurrency: Infinity,
  name: 'unnamed'
};

/**
 * Iterates over the provided {tasks} and converts the non Task items
 * (e.g. normal functions, Flow instances) to Task
 *
 * @param {Array|Object} tasks The list or object of tasks (Function|Task|Flow)
 *
 * @returns {Array<Task>} The list of converted Tasks
 */
function prepareTasks(tasks: any): any[] {
  return map(tasks, (handler: any, id: any) => {
    // handler is a Flow, convert it to Task
    if (Utils.isFlow(handler)) {
      return handler.asTask(id);
    }

    // handler is a normal function, convert it to Task
    if (!Utils.isTask(handler)) {
      return Task.create(id, handler);
    }

    // handler is already a Task, only assign id if not already done
    handler.id = handler.id || id;

    return handler;
  });
}

/**
 * The main Flow factory function
 *
 * @param {Function}     runner    The Flow's Tasks runner
 * @param {Array|Object} tasks     The list or object of tasks (Function|Task|Flow)
 * @param {Object}       [options] The Flow's options
 * @param {boolean}      [options.resultsAsArray] Whether return the results as array or not
 * @param {boolean}      [options.abortOnError]   Whether Flow's execution should be aborted on error or not
 * @param {number}       [options.concurrency]    The Tasks execution concurrency (applies for parallel flows only)
 * @param {string}       [options.name]           The Flow's name
 *
 * @returns {Flow} The Flow instance
 */
function createFlow(runner: any, tasks: any, options?: any): any {
  const opts: {
    mode: string,
    resultsAsArray: boolean,
    abortOnError: boolean,
    concurrency: number,
    name: string,
    piped?: boolean // Add piped as an optional property
  } = defaults(
    { mode: runner.name },
    options,
    { resultsAsArray: !isPlainObject(tasks) },
    defaultOptions
  );
  const flowTasks: any[] = prepareTasks(tasks);
  const orderedIDs: string[] = flowTasks.map(task => task.id);
  const debug = createDebug(`flow-wing{${opts.name}}:${opts.mode}`);
  const pipedFlows: any[] = [];

  /**
   * The Flow represents a list/object of one or more Task to be executed
   * in one of the run modes {series|waterfall|parallel}
   * @typedef {Object} Flow
   */
  const flow: any = { // Temporarily type flow as any to add properties
    name: opts.name as string,
    mode: opts.mode as string,
    run(context: any, mainRuntime?: any) {
      const runtime: {errors: any[], previousResult: any, context: any, flow: any, opts: any} = createRuntime(mainRuntime, context, flow, opts);

      debug('executing with options: %o', opts);

      return runner(flowTasks, runtime, opts)
        .then((data: {results: any, errors: any[]}) => {
          debug('execution finished successfully');

          const results: any = Results.parse(data.results, orderedIDs, opts);
          // Append errors to the runtime
          if (data.errors) { // Ensure data.errors exists
            runtime.errors.push(...data.errors);
          }
          runtime.previousResult = results;

          const flowResult: any = {
            results,
            errors: runtime.errors,
            context: runtime.context
          };

          return flowResult;
        })
        .then((data: any) => {
          if (pipedFlows.length > 0) {
            debug('running %d piped flows', pipedFlows.length);
            const name: string = [flow.name].concat(pipedFlows.map(f => f.name)).join('>');
            const pipedFlowsOpts: any = Object.assign({}, opts, { name });

            return createFlow(Runner.waterfall, prepareTasks(pipedFlows), pipedFlowsOpts)
              .run(runtime.context, runtime);
          }

          return data;
        })
        .then((data: {results: any}) => { // Assuming data has results property
          const isMainFlow = runtime.flow === flow;
          const onlyOneResult = Array.isArray(data.results) && data.results.length === 1;

          if (isMainFlow && onlyOneResult) {
            debug('unwrapping single task result');
            data.results = Results.extractLast(data.results);
          }

          return data;
        });
    },

    asTask(id: string | number) {
      debug('converting to task');

      const task: any = Task.create(id, (context: any, runtime: any) => {
        return flow.run(context, runtime)
          .then((data: {results: any}) => data.results);
      });

      return Object.defineProperty(task, 'flowAsTask', { value: true });
    },

    pipe(flowToPipe: any) {
      debug(`piping flow-wing{${flowToPipe.name}}:${flowToPipe.mode} into flow-wing{${flow.name}}:${flow.mode}`);

      opts.piped = true;
      pipedFlows.push(flowToPipe);

      return flow;
    },

    unpipe(flowToUnpipe?: any) { // Make flowToUnpipe optional
      if (!flowToUnpipe) {
        pipedFlows.splice(0, pipedFlows.length);
        opts.piped = false;

        debug('all piped flows were un-piped');

        return flow;
      }

      const index = pipedFlows.findIndex(flow => flow === flowToUnpipe);

      /* istanbul ignore else  */
      if (index > -1) {
        opts.piped = pipedFlows.length > 0;
        pipedFlows.splice(index, 1);
        debug(`flow-wing{${flowToUnpipe.name}}:${flowToUnpipe.mode} was un-piped`);
      } else {
        debug(`the flow-wing{${flowToUnpipe.name}}:${flowToUnpipe.mode} is not piped into this one`);
      }

      return flow;
    }
  };

  return flow;
}

const flow = partial(createFlow, Runner.series) as FlowFunction;
flow.series = partial(createFlow, Runner.series);
flow.waterfall = partial(createFlow, Runner.waterfall);
flow.parallel = partial(createFlow, Runner.parallel);
flow.Task = Task;

export default flow;
