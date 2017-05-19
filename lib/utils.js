'use strict';

const isPromise = require('is-promise');
const VError = require('verror');
const isFunction = require('lodash.isfunction');
const isPlainObject = require('lodash.isplainobject');

const utils = {
  isPromise,

  isFunction,

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

  buildError(cause, taskId, runOpts) {
    return new VError({
      cause,
      name: 'TaskError',
      info: {
        flow: {
          taskId,
          name: runOpts.name,
          type: runOpts.type,
        },
      },
    }, `task "${taskId}" in flow "${runOpts.name}" failed`);
  },
};

module.exports = utils;
