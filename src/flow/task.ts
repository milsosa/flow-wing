import debugLib from 'debug';
import * as Utils from '../utils';
import { Task, TaskHandler } from '../types';

const debug = debugLib('flow-wing:task');

type Callback = (err: Error | null, result?: any) => void;

interface TaskDefinition {
  handler: TaskHandler;
  args: any[];
}

function buildCallback(resolve: (value: any) => void, reject: (reason: any) => void): Callback {
  let called = false;
  return (err, result) => {
    if (!called) {
      called = true;
      return err ? reject(err) : resolve(result);
    }
    debug('ignoring callback call in an already resolved/finished task');
  };
}

function runTask(task: TaskDefinition, context: any, previousResult: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const callback = buildCallback(resolve, reject);
    const taskArgs = previousResult === undefined ? task.args : [previousResult, ...task.args];
    const callArgs: [any, ...any[], Callback] = [context, ...taskArgs, callback];

    const result = task.handler.apply(undefined, callArgs);

    if (Utils.isPromise(result)) {
      result.then((res: any) => callback(null, res), callback);
      return;
    }

    if (result !== undefined) {
      callback(null, result);
    }
  });
}

function validateHandler(handler: any): asserts handler is TaskHandler {
  if (!Utils.isFunction(handler)) {
    throw new TypeError(`The task handler should be a function, got "${typeof handler}"`);
  }
}

function create(id: string, handler: TaskHandler, ...args: any[]): Task;
function create(handler: TaskHandler, ...args: any[]): Task;
function create(idOrHandler: string | TaskHandler, ...args: any[]): Task {
  let id: string;
  let handler: TaskHandler;
  let taskArgs: any[];

  if (typeof idOrHandler === 'string') {
    id = idOrHandler;
    handler = args.shift() as TaskHandler;
    taskArgs = args;
  } else {
    handler = idOrHandler;
    id = handler.name;
    taskArgs = args;
  }

  validateHandler(handler);

  const stack: TaskDefinition[] = [{ handler, args: taskArgs }];

  const task: Task = {
    id,

    pipe(handler: TaskHandler, ...args: any[]): Task {
      validateHandler(handler);
      stack.push({ handler, args });
      return task;
    },

    run(context: any, value: any): Promise<any> {
      return stack.reduce((promise, taskDef) => {
        return promise.then(previousResult => runTask(taskDef, context, previousResult));
      }, Promise.resolve(value));
    }
  };

  return task;
}


export default { create };
