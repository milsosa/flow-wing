'use strict';

const Promise = require('bluebird');
const debug = require('debug')('flow-wing:task');
const Utils = require('../utils');

/**
 * Builds a callbak to be passed to the Task's handler
 *
 * @param {Function} resolve The Promise's resolve function
 * @param {Function} reject  The Promise's reject function
 *
 * @returns {Function} The callbak function, when called it will call resolve
 *                     or reject dependening on whether a error was passed or not
 */
function buildCallback(resolve, reject) {
  let called = false;
  return (err, result) => {
    if (!called) {
      called = true;
      return err ? reject(err) : resolve(result);
    }

    debug('ignoring callback call in an already resolved/finished task');
  };
}

/**
 * Runs the provided {task}
 *
 * @param {Task} task           The task to run
 * @param {*}    context        The running Flow's context
 * @param {*}    previousResult The previous task result value
 *
 * @returns {Promise} The task's Promise that will be resolved/rejected accordingly
 */
function runTask(task, context, previousResult) {
  return new Promise((resolve, reject) => {
    const callback = buildCallback(resolve, reject);

    const taskArgs = previousResult === undefined ? task.args : [previousResult].concat(task.args);
    const callArgs = [].concat(context, taskArgs, callback);

    const result = task.handler.apply(undefined, callArgs);

    if (Utils.isPromise(result)) {
      return result.then(callback.bind(null, null), callback);
    } else if (result !== undefined) {
      callback(null, result);
    }
  });
}

/**
 * Validates that the provided {handler} is a Function
 *
 * @param {Function} handler The Task's handler function
 *
 * @throws {TypeError} Throws when {handler} is not a Function
 */
function validateHandler(handler) {
  if (!Utils.isFunction(handler)) {
    throw new TypeError(`The task handler should be a function, got "${typeof handler}"`);
  }
}

module.exports = {
  /**
   * Creates a Task with for the provided {handler} function
   *
   * @param {string}   [id]    The Task's id
   * @param {Function} handler The Task's handler function
   *
   * @returns {Task} The Task instance
   */
  create(id, handler/* , ...args */) {
    const args = Utils.restArgs(arguments, 2);

    if (Utils.isFunction(id)) {
      args.unshift(handler);
      handler = id;
      id = handler.name;
    }

    validateHandler(handler);

    const stack = [{ handler, args }];

    /**
     * The Task that represents one of the Flow's function to be runned
     * @typedef {Object} Task
     */
    const task = {
      id,

      /**
       * Pipes the {handler} function to be executed sequentially to the
       * main Task's handler
       *
       * @param {Function} handler The handler function to pipe
       *
       * @returns {Task} The Task itself
       */
      pipe(handler/* , ...args */) {
        validateHandler(handler);
        stack.push({ handler, args: Utils.restArgs(arguments, 1) });
        return task;
      },

      /**
       * Runs the Task function(s)
       *
       * @param {Object} context The running Flow's context
       * @param {*}      value   The previous task result value when running
       *                         in Waterfall or in a piped Flow
       *
       * @returns {Promise} The Task's Promise
       */
      run(context, value) {
        return stack.reduce((promise, task) => {
          return promise.then(previousResult => runTask(task, context, previousResult));
        }, Promise.resolve(value));
      }
    };

    return task;
  }
};
