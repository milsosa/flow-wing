'use strict';

const Promise = require('bluebird');
const partial = require('lodash.partial');
const defaults = require('lodash.defaults');
const isPlainObject = require('lodash.isplainobject');
const map = require('lodash.map');
const debug = require('./debug');
const Task = require('./task');
const Utils = require('./utils');
const Runner = require('./runner');

const defaultOptions = {
  resultsAsArray: true,
  returnErrors: true,
  abortOnError: true,
  concurrency: 0,
};

// Iterate over tasks's id to return the results orderly
const getValues = (results, tasksIDs) => tasksIDs.map(id => results[id]);

function getResults(results, tasksIDs, opts) {
  if (opts.resultsAsArray && isPlainObject(results)) {
    results = getValues(results, tasksIDs);
  }

  if (Array.isArray(results) && opts.type === 'waterfall') {
    return results.pop();
  }

  return results;
}

function prepareTasks(tasks) {
  return map(tasks, (task, id) => {
    if (!Utils.isTask(task)) {
      return Task.create(id, task);
    }
    task.id = task.id || id;
    return task;
  });
}

function toTasks(flows) {
  return flows.reduce((tasks, flow) => tasks.concat(flow.asTask()), []);
}

function shouldPipeValue(opts) {
  return opts.isPiped || opts.type !== 'parallel';
}

function createFlow(runner, tasks, options) {
  const flowTasks = prepareTasks(tasks);
  const opts = defaults({ type: runner.name }, options, { resultsAsArray: !isPlainObject(tasks), name: 'unnamed' }, defaultOptions);
  const orderedIDs = flowTasks.map(task => task.id);
  const pipedFlows = [];

  const flow = {
    name: opts.name,
    type: opts.type,
    run(ctx, prevValue) {
      const context = ctx || {};
      prevValue = shouldPipeValue(opts) ? prevValue : undefined;

      debug(`flow{${opts.name}}:${opts.type}`, 'executing with options: %o', opts);

      return runner(flowTasks, context, prevValue, opts)
        .then((data) => {
          const results = getResults(data.results, orderedIDs, opts);
          const flowResult = {
            context,
            results,
          };

          if (opts.returnErrors) {
            flowResult.errors = data.errors;
          }

          return flowResult;
        })
        .then((data) => {
          if (pipedFlows.length > 0) {
            const name = [flow.name].concat(pipedFlows.map(f => f.name)).join('>');
            const pipedFlowsOpts = Object.assign({}, opts, { name });
            return createFlow(Runner.waterfall, toTasks(pipedFlows), pipedFlowsOpts)
              .run(context, data.results);
          }

          return data;
        });
    },

    asTask(id) {
      return Task.create(id, (context, prevValue) => {
        return flow.run(context, prevValue)
          .then(data => data.results);
      });
    },

    pipe(flowToPipe) {
      opts.isPiped = true;
      pipedFlows.push(flowToPipe);

      return flow;
    },

    unpipe(flowToUnpipe) {
      const index = pipedFlows.findIndex(flow => flow === flowToUnpipe);

      if (index > -1) {
        opts.isPiped = false;
        pipedFlows.splice(index, 1);
        debug(`flow{${opts.name}}:${opts.type}`, `flow{${flowToUnpipe.name}}:${flowToUnpipe.type} was unpiped`);
      } else {
        debug(`flow{${opts.name}}:${opts.type}`, 'the provided flow is not piped into this one');
      }

      return flow;
    },
  };

  return flow;
}

const seriesFlow = partial(createFlow, Runner.series);
const waterfallFlow = partial(createFlow, Runner.waterfall);
const parallelFlow = partial(createFlow, Runner.parallel);

exports = module.exports = seriesFlow;
exports.series = seriesFlow;
exports.waterfall = waterfallFlow;
exports.parallel = parallelFlow;
exports.Task = Task;
