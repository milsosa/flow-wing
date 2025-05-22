'use strict';

import VError from 'verror';
import isPromise from 'is-promise';
import isFunction from 'lodash.isfunction';
import isPlainObject from 'lodash.isplainobject';

function isTask(obj) {
  return isPlainObject(obj) && isFunction(obj.run) && isFunction(obj.pipe);
}

function isFlow(obj) {
  return isPlainObject(obj) && isFunction(obj.run) && isFunction(obj.asTask);
}

function buildTaskError(cause, taskID, flowOpts) {
  return new VError({
    cause,
    name: 'TaskError',
    constructorOpt: buildTaskError, // Use the function name directly
    info: {
      taskID,
      flowName: flowOpts.name,
      flowMode: flowOpts.mode
    }
  }, `task "${taskID}" in flow{${flowOpts.name}}:${flowOpts.mode} has failed`);
}

export default {
  isPromise,
  isFunction,
  isTask,
  isFlow,
  buildTaskError
};
