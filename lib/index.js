'use strict';

const partial = require('lodash.partial');
const defaults = require('lodash.defaults');
const isPlainObject = require('lodash.isplainobject');
const createDebug = require('debug');
const map = require('lodash.map');
const Task = require('./task');
const Utils = require('./utils');
const Runner = require('./runner');

const runtimeProperty = Symbol('@flow_runtime');
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
function prepareTasks(tasks, runtime) {
  return map(tasks, (handler, id) => {
    // Handler is a Flow, convert it to Task
    if (Utils.isFlow(handler)) {
      return handler.asTask(id, runtime);
    }

    // Handler is a normal function, convert it to Task
    if (!Utils.isTask(handler)) {
      return Task.create(id, handler);
    }

    // Handler is already a Task
    handler.id = handler.id || id;

    // Attach the runtime object to the task
    addRuntimeData(handler, runtime);

    return handler;
  });
}

/**
 * Appends the {errors} to the runtime errors array
 *
 * @param {Object} runtime The main Flow's runtime object
 * @param {Array}  errors  The errors list to append to the {runtime.errors}
 */
function appendErrors(runtime, errors) {
  errors.forEach(error => runtime.errors.push(error));
}

/**
 * Attaches the {runtime} object to the provided {task}
 * when it's not already attached
 *
 * @param {Task}   task    The Task to which attach the runtime object
 * @param {Object} runtime The main Flow's runtime object
 */
function addRuntimeData(task, runtime) {
  if (!task[runtimeProperty] && runtime) {
    Object.defineProperty(task, runtimeProperty, { value: runtime });
  }
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
  const flowRuntime = { opts, errors: [] };
  const flowTasks = prepareTasks(tasks, flowRuntime);
  const orderedIDs = flowTasks.map(task => task.id);
  const debug = createDebug(`flow-wing{${opts.name}}:${opts.mode}`);
  const pipedFlows = [];

  const flow = {
    name: opts.name,
    mode: opts.mode,
    run(providedContext, mainRuntime) {
      const runtime = mainRuntime || flowRuntime;
      runtime.context = providedContext || {};

      console.log('flow %s starting', opts.name);
      console.log('with runtime', runtime.opts.name);
      console.log('with main runtime', mainRuntime && mainRuntime.opts.name);
      console.log('and previous result', runtime.previousResult, '\n');

      // if (flow.mainRuntime) {
      //   runtime = flow.mainRuntime;
      //   delete flow.mainRuntime;
      // }

      // let valueToPipe;
      // if (!Utils.pipeResult(runtime.opts)) {
      //   previousResult = undefined;
      // }

      debug('executing with options: %o', opts);

      return runner(flowTasks, runtime, opts)
        .then(data => {
          debug('execution finished sucessfully');

          const results = getResults(data.results, orderedIDs, opts);

          runtime.previousResult = results;
          appendErrors(runtime, data.errors);

          const flowResult = {
            context: runtime.context,
            results
          };

          if (!opts.abortOnError) {
            flowResult.errors = runtime.errors.slice();
          }

          // console.log('flow %s finished', opts.name);
          // console.log('with runtime', runtime.opts.name);
          // console.log('and previous result', runtime.previousResult);
          // console.log('and errors', runtime.errors.length, '\n');

          return flowResult;
        })
        .then(data => {
          if (pipedFlows.length > 0) {
            debug('running %d piped flows', pipedFlows.length);
            const name = [flow.name].concat(pipedFlows.map(f => f.name)).join('>');
            const pipedFlowsOpts = Object.assign({}, opts, { name });

            return createFlow(Runner.waterfall, prepareTasks(pipedFlows, runtime), pipedFlowsOpts)
              .run(runtime.context, runtime);
          }

          return data;
        });
    },

    asTask(id, mainRuntime) {
      debug('converting to task');

      const task = Task.create(id, (context) => {
        return flow.run(context, task[runtimeProperty])
          .then(data => data.results);
      });

      addRuntimeData(task, mainRuntime);

      return task;
    },

    pipe(flowToPipe) {
      debug(`piping flow-wing{${flowToPipe.name}}:${flowToPipe.mode} into flow-wing{${flow.name}}:${flow.mode}`);

      const id = flowToPipe.name === defaultOptions.name ? undefined : flowToPipe.name;

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
