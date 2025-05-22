'use strict';

import debugLib from 'debug';
import Utils from '../utils';

const debug = debugLib('flow-wing:task');

/**
 * Builds a callback to be passed to the Task's handler
 *
 * @param {Function} resolve The Promise's resolve function
 * @param {Function} reject  The Promise's reject function
 *
 * @returns {Function} The callback function that when called, it will call resolve
 *                     or reject depending on whether a error was passed or not
 */
function buildCallback(resolve: (value: any) => void, reject: (reason?: any) => void): (err: any, result: any) => any {
  let called: boolean = false;
  return (err: any, result: any) => {
    /* istanbul ignore else  */
    if (!called) {
      called = true;
      return err ? reject(err) : resolve(result);
    }

    /* istanbul ignore next */
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
interface TaskItem { // Define a more specific type for task items in the stack
  handler: Function;
  args: any[];
  id?: string | number; // id might not always be present on the TaskItem itself if it's part of the stack
}

function runTask(task: TaskItem, context: any, previousResult: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const callback = buildCallback(resolve, reject);

    const taskArgs: any[] = previousResult === undefined ? task.args : [previousResult].concat(task.args || []); // Ensure task.args is an array
    const callArgs: any[] = [context].concat(taskArgs, callback as any); // Cast callback to any to resolve concat issue for now

    const result: any = task.handler.apply(undefined, callArgs);

    if (Utils.isPromise(result)) {
      return result.then(callback.bind(null, null), callback);
    }

    if (result !== undefined) {
      return callback(null, result);
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
function validateHandler(handler: any): void {
  if (!Utils.isFunction(handler)) {
    throw new TypeError(`The task handler should be a function, got "${typeof handler}"`);
  }
}

/**
 * Creates a Task for the provided {handler} function
 *
 * @param {string}   [id]    The Task's id
 * @param {Function} handler The Task's handler function
 * @param {Array}    args    The handler's arguments
 *
 * @returns {Task} The Task instance
 */
function create(id: string | number | Function, handler?: Function, ...args: any[]): any {
  let taskHandler: Function;
  let taskId: string | number;

  if (Utils.isFunction(id)) {
    args.unshift(handler as any); // handler might be undefined here if id is a function
    taskHandler = id as Function;
    taskId = taskHandler.name;
  } else if (handler && Utils.isFunction(handler)) {
    taskHandler = handler;
    taskId = id as string | number;
  } else {
    // This case implies 'id' is the handler if 'handler' is not a function
    taskHandler = id as Function;
    taskId = taskHandler.name; // Or some default
  }

  validateHandler(taskHandler);

  const stack: TaskItem[] = [{ handler: taskHandler, args }];

  /**
   * The Task represents a function to be executed by a Flow instance
   * @typedef {Object} Task
   */
  const task: any = { // Temporarily type task as any to add properties
    id: taskId,

    /**
     * Pipes the {handler} function to be executed sequentially to the
     * main Task's handler
     *
     * @param {Function} handler The handler function to pipe
     * @param {Array}    args    The handler's arguments
     *
     * @returns {Task} The Task itself
     */
    pipe(handler: Function, ...args: any[]): any {
      validateHandler(handler);
      stack.push({ handler, args });
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
    run(context: any, value?: any): Promise<any> {
      return stack.reduce((promise: Promise<any>, taskItem: TaskItem) => {
        return promise.then(previousResult => runTask(taskItem, context, previousResult));
      }, Promise.resolve(value));
    }
  };

  return task;
}

export default {
  create
};
