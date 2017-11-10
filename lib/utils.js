'use strict';

const VError = require('verror');
const isPromise = require('is-promise');
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

  buildTaskError(cause, taskID, flowOpts) {
    return new VError({
      cause,
      name: 'TaskError',
      constructorOpt: utils.buildTaskError,
      info: {
        taskID,
        flowName: flowOpts.name,
        flowMode: flowOpts.mode
      }
    }, `task "${taskID}" in flow{${flowOpts.name}}:${flowOpts.mode} has failed`);
  }
};

module.exports = utils;
