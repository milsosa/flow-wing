'use strict';

const isPromise = require('is-promise');
const VError = require('verror');
const isFunction = require('lodash.isfunction');
const isPlainObject = require('lodash.isplainobject');

const utils = {
  isPromise,

  isFunction,

  pipeResult(opts) {
    const obj = opts.mainFlowOpts || opts;

    return obj.piped || obj.mode === 'waterfall';
  },

  isTask(obj) {
    return isPlainObject(obj) && isFunction(obj.run) && isFunction(obj.pipe);
  },

  isFlow(obj) {
    return isPlainObject(obj) && isFunction(obj.run) && isFunction(obj.asTask);
  },

  restArgs(args, skip) {
    const len = args.length;
    const rest = Array(len > skip ? len - skip : 0);

    for (let i = skip; i < len; i++) {
      rest[i - skip] = args[i];
    }

    return rest;
  },

  buildTaskError(cause, taskID, runOpts) {
    return new VError({
      cause,
      name: 'TaskError',
      constructorOpt: utils.buildTaskError,
      info: {
        taskID,
        flowName: runOpts.name,
        flowMode: runOpts.mode
      }
    }, `task "${taskID}" in flow{${runOpts.name}}:${runOpts.mode} has failed`);
  }
};

module.exports = utils;
