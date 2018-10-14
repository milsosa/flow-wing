'use strict';

const partial = require('lodash.partial');
const defaults = require('lodash.defaults');
const isPlainObject = require('lodash.isplainobject');
const createDebug = require('debug');
const map = require('lodash.map');
const Utils = require('../utils');
const Runner = require('../runner');
const Results = require('./results');
const createRuntime = require('./runtime');
const Task = require('./task');

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
function prepareTasks(tasks) {
  return map(tasks, (handler, id) => {
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
function createFlow(runner, tasks, options) {
  const opts = defaults(
    { mode: runner.name },
    options,
    { resultsAsArray: !isPlainObject(tasks) },
    defaultOptions
  );
  const flowTasks = prepareTasks(tasks);
  const orderedIDs = flowTasks.map(task => task.id);
  const debug = createDebug(`flow-wing{${opts.name}}:${opts.mode}`);
  const pipedFlows = [];

  /**
   * The Flow represents a list/object of one or more Task to be executed
   * in one of the run modes {series|waterfall|parallel}
   * @typedef {Object} Flow
   */
  const flow = {
    name: opts.name,
    mode: opts.mode,
    run(context, mainRuntime) {
      const runtime = createRuntime(mainRuntime, context, flow, opts);

      debug('executing with options: %o', opts);

      return runner(flowTasks, runtime, opts)
        .then(data => {
          debug('execution finished sucessfully');

          const results = Results.parse(data.results, orderedIDs, opts);
          // Append errors to the runtime
          runtime.errors.push(...data.errors);
          runtime.previousResult = results;

          const flowResult = {
            results,
            errors: runtime.errors,
            context: runtime.context
          };

          return flowResult;
        })
        .then(data => {
          if (pipedFlows.length > 0) {
            debug('running %d piped flows', pipedFlows.length);
            const name = [flow.name].concat(pipedFlows.map(f => f.name)).join('>');
            const pipedFlowsOpts = Object.assign({}, opts, { name });

            return createFlow(Runner.waterfall, prepareTasks(pipedFlows), pipedFlowsOpts)
              .run(runtime.context, runtime);
          }

          return data;
        })
        .tap(data => {
          const isMainFlow = runtime.flow === flow;
          const onlyOneResult = Array.isArray(data.results) && data.results.length === 1;

          if (isMainFlow && onlyOneResult) {
            debug('unwrapping single task result');
            data.results = Results.extractLast(data.results);
          }
        });
    },

    asTask(id) {
      debug('converting to task');

      const task = Task.create(id, (context, runtime) => {
        return flow.run(context, runtime)
          .then(data => data.results);
      });

      return Object.defineProperty(task, 'flowAsTask', { value: true });
    },

    pipe(flowToPipe) {
      debug(`piping flow-wing{${flowToPipe.name}}:${flowToPipe.mode} into flow-wing{${flow.name}}:${flow.mode}`);

      opts.piped = true;
      pipedFlows.push(flowToPipe);

      return flow;
    },

    unpipe(flowToUnpipe) {
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

const flow = partial(createFlow, Runner.series);
flow.series = partial(createFlow, Runner.series);
flow.waterfall = partial(createFlow, Runner.waterfall);
flow.parallel = partial(createFlow, Runner.parallel);
flow.Task = Task;

module.exports = flow;
