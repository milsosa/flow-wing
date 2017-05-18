'use strict';

const assert = require('assert');
const Promise = require('bluebird');
const debug = require('debug')('flow:task');
const Utils = require('./utils');

const buildCallback = (resolve, reject) => {
  let called = false;
  return (err, result) => {
    if (!called) {
      called = true;
      return err ? reject(err) : resolve(result);
    }
    debug('ignoring callback call in an already resolved/finished task');
  };
};

const runTask = (task, ctx, prevValue) => {
  return new Promise((resolve, reject) => {
    const callback = buildCallback(resolve, reject);

    const taskArgs = prevValue !== undefined ? [prevValue].concat(task.args) : task.args;
    const callArgs = [].concat(ctx, taskArgs, callback);

    const result = task.handler.apply(task, callArgs);

    if (Utils.isPromise(result)) {
      return result.then(callback.bind(null, null), callback);
    } else if (result !== undefined) {
      callback(null, result);
    }
  });
};

function validateHandler(handler) {
  if (!Utils.isFunction(handler)) {
    throw new Error('The task handler should be a function');
  }
}

module.exports = {
  create(id, handler/*, ...args*/) {
    const args = Utils.restArgs(arguments, 2);

    if (Utils.isFunction(id)) {
      args.unshift(handler);
      handler = id;
      id = handler.name || undefined;
    }

    validateHandler(handler);

    const stack = [{ handler, args }];

    const task = {
      id,

      pipe(handler/*, ...args*/) {
        validateHandler(handler);
        stack.push({ handler, args: Utils.restArgs(arguments, 1) });
        return task;
      },

      run(ctx, value) {
        return stack.reduce((promise, task) => {
          return promise.then(prevValue => runTask(task, ctx, prevValue));
        }, Promise.resolve(value));
      },
    };

    return task;
  },
};
