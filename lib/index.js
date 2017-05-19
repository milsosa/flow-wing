'use strict';

const partial = require('lodash.partial');
const defaults = require('lodash.defaults');
const isPlainObject = require('lodash.isplainobject');
const createDebug = require('debug');
const map = require('lodash.map');
const Task = require('./task');
const Utils = require('./utils');
const Runner = require('./runner');

const defaultOptions = {
  resultsAsArray: true,
  abortOnError: true,
  concurrency: Infinity,
  name: 'unnamed'
};

/**
 * Extracts the Flow's result(s) based on the provided options
 * and the running mode {series|waterfall|parallel}
 *
 * @param {Array|Object} results  The Flow's execution results
 * @param {Array}        tasksIDs The Flow's Tasks' ID ordered
 * @param {Object}       opts     The Flow's options
 *
 * @returns The extracted result(s)
 */
function getResults(results, tasksIDs, opts) {
  if (opts.resultsAsArray && isPlainObject(results)) {
    // Iterate over tasks's id to return the results orderly
    results = tasksIDs.map(id => results[id]);
  }

  if (Array.isArray(results) && opts.mode === 'waterfall') {
    return results.pop();
  }

  return results;
}

/**
 * Iterates over the provided {tasks} and converts the non Task items
 * (e.g. normal functions, Flow instances) to Task
 *
 * @param {Array|Object} tasks The list or object of tasks (Function|Task)
 * @param {Object}       opts  The Flow's options
 *
 * @returns {Array<Task>} The list of converted Tasks
 */
function prepareTasks(tasks, opts) {
  return map(tasks, (handler, id) => {
    // Handler is a Flow, convert it to Task
    if (Utils.isFlow(handler)) {
      return handler.asTask(id, opts);
    }

    // Handler is a Flow converted to Task
    if (Utils.isFlow(handler.flow)) {
      // Attach main flow options
      // TODO: Find a better way to share the main flow options
      handler.id = handler.id || id;
      handler.flow.mainFlowOpts = opts;

      return handler;
    }

    // Handler is a normal function, convert it to Task
    if (!Utils.isTask(handler)) {
      return Task.create(id, handler);
    }

    // Handler is already a Task
    handler.id = handler.id || id;

    return handler;
  });
}

/**
 * The main Flow factory function
 *
 * @param {Function}     runner    The Flow's Tasks runner
 * @param {Array|Object} tasks     The Tasks to run
 * @param {Object}       [options] The Flow's options
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
  const flowTasks = prepareTasks(tasks, opts);
  const orderedIDs = flowTasks.map(task => task.id);
  const debug = createDebug(`flow-wing{${opts.name}}:${opts.mode}`);
  const pipedFlowsTasks = [];

  const flow = {
    name: opts.name,
    mode: opts.mode,
    run(ctx, previousResult) {
      const context = ctx || {};

      if (flow.mainFlowOpts) {
        opts.mainFlowOpts = Object.assign({}, flow.mainFlowOpts);
        delete flow.mainFlowOpts;
      }

      if (!Utils.pipeResult(opts)) {
        previousResult = undefined;
      }

      debug('executing with options: %o', opts);

      return runner(flowTasks, context, previousResult, opts)
        .then(data => {
          debug('execution finished sucessfully');

          const results = getResults(data.results, orderedIDs, opts);
          const flowResult = {
            context,
            results
          };

          if (!opts.abortOnError) {
            flowResult.errors = data.errors;
          }

          return flowResult;
        })
        .then(data => {
          if (pipedFlowsTasks.length > 0) {
            debug('running %d piped flows', pipedFlowsTasks.length);
            const name = [flow.name].concat(pipedFlowsTasks.map(task => task.flow.name)).join('>');
            const pipedFlowsOpts = Object.assign({}, opts, { name });
            return createFlow(Runner.waterfall, pipedFlowsTasks, pipedFlowsOpts)
              .run(context, data.results);
          }

          return data;
        });
    },

    asTask(id, mainFlowOpts) {
      if (mainFlowOpts) {
        opts.mainFlowOpts = mainFlowOpts;
      }

      debug('converting to task');

      const task = Task.create(id, (context, previousResult) => {
        // Avoid passing task's callback since we're returning a promise
        previousResult = Utils.isFunction(previousResult) ? undefined : previousResult;

        return flow.run(context, previousResult)
          .then(data => data.results);
      });

      return Object.defineProperty(task, 'flow', { value: flow });
    },

    pipe(flowToPipe) {
      debug(`piping flow-wing{${flowToPipe.name}}:${flowToPipe.mode} into flow-wing{${flow.name}}:${flow.mode}`);

      const id = flowToPipe.name === defaultOptions.name ? undefined : flowToPipe.name;

      opts.piped = true;
      pipedFlowsTasks.push(flowToPipe.asTask(id, opts));

      return flow;
    },

    unpipe(flowToUnpipe) {
      if (!flowToUnpipe) {
        pipedFlowsTasks.splice(0, pipedFlowsTasks.length);
        opts.piped = false;

        debug('all piped flows were un-piped');

        return flow;
      }

      const index = pipedFlowsTasks.findIndex(task => task.flow === flowToUnpipe);

      if (index > -1) {
        opts.piped = pipedFlowsTasks.length > 0;
        pipedFlowsTasks.splice(index, 1);
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
