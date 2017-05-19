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
  abortOnError: true,
  concurrency: 0,
  name: 'unnamed',
};

function getResults(results, tasksIDs, opts) {
  if (opts.resultsAsArray && isPlainObject(results)) {
    // Iterate over tasks's id to return the results orderly
    results = tasksIDs.map(id => results[id]);
  }

  if (Array.isArray(results) && opts.type === 'waterfall') {
    return results.pop();
  }

  return results;
}

function prepareTasks(tasks) {
  return map(tasks, (item, id) => {
    if (!Utils.isTask(item)) {
      return Task.create(id, item);
    }

    if (Utils.isFlow(item)) {
      return item.asTask();
    }

    item.id = item.id || id;

    return item;
  });
}

function shouldPipeValue(opts) {
  return opts.isPiped || opts.type !== 'parallel';
}

function createFlow(runner, tasks, options) {
  const flowTasks = prepareTasks(tasks);
  const opts = defaults({ type: runner.name }, options, { resultsAsArray: !isPlainObject(tasks) }, defaultOptions);
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

          if (!opts.abortOnError) {
            flowResult.errors = data.errors;
          }

          return flowResult;
        })
        .then((data) => {
          if (pipedFlows.length > 0) {
            const name = [flow.name].concat(pipedFlows.map(f => f.name)).join('>');
            const pipedFlowsOpts = Object.assign({}, opts, { name });
            return createFlow(Runner.waterfall, prepareTasks(pipedFlows), pipedFlowsOpts)
              .run(context, data.results);
          }

          return data;
        });
    },

    asTask(id) {
      return Task.create(id || flow.name, (context, prevValue) => {
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
      if (!flowToUnpipe) {
        pipedFlows.splice(0, pipedFlows.length);

        debug(`flow{${opts.name}}:${opts.type}`, `all the piped flows were unpiped`);

        return flow;
      }

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
