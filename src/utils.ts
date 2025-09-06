import VError from 'verror';
import isPromise from 'is-promise';
import { Flow, FlowOptions, Task } from './types';

export { isPromise };

// A simple implementation of isPlainObject
export function isPlainObject(obj: any): obj is Record<string, any> {
  return Object.prototype.toString.call(obj) === '[object Object]';
}

export function isFunction(value: any): value is Function {
  return typeof value === 'function';
}

export function isTask(obj: any): obj is Task {
  return isPlainObject(obj) && isFunction(obj.run) && isFunction(obj.pipe);
}

export function isFlow(obj: any): obj is Flow {
  return isPlainObject(obj) && isFunction(obj.run) && isFunction(obj.asTask);
}

export function buildTaskError(cause: Error, taskID: string, flowOpts: FlowOptions): VError {
  return new VError({
    cause,
    name: 'TaskError',
    constructorOpt: buildTaskError,
    info: {
      taskID,
      flowName: flowOpts.name,
      flowMode: flowOpts.mode
    }
  }, `task "${taskID}" in flow{${flowOpts.name}}:${flowOpts.mode} has failed`);
}
