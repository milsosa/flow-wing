import { it, expect, describe } from 'vitest';
import VError from 'verror';
import flow from '../src';
import * as Utils from '../src/utils';
import { FlowOptions } from '../src/types';

const Task = (flow as any).Task;

describe('Utils', () => {
  it('.isPromise() should return true when a task is passed', () => {
    const promise = Promise.resolve(true);

    expect(Utils.isPromise(promise)).toBe(true);
    expect(Utils.isPromise(() => {})).toBe(false);
    expect(Utils.isPromise({})).toBe(false);
  });

  it('.isFunction() should return true when a function is passed', () => {
    expect(Utils.isFunction(() => {})).toBe(true);
    expect(Utils.isFunction({})).toBe(false);
  });

  it('.isTask() should return true when a task instance is passed', () => {
    const task = Task.create('task', () => {});

    expect(Utils.isTask(task)).toBe(true);
    expect(Utils.isTask(() => {})).toBe(false);
    expect(Utils.isTask({})).toBe(false);
  });

  it('.isFlow() should return true when a flow instance is passed', () => {
    const task = Task.create('task', () => {});
    const testFlow = flow([task]);

    expect(Utils.isFlow(testFlow)).toBe(true);
    expect(Utils.isFlow(() => {})).toBe(false);
    expect(Utils.isFlow({})).toBe(false);
  });

  it('.buildTaskError() should build a TaskError that includes the passed cause', () => {
    const cause = new Error('something went wrong');
    const taskID = 'task-id';
    const flowOpts: FlowOptions = { name: 'flow-name', mode: 'parallel' };
    const expectedInfo = {
      taskID: 'task-id',
      flowName: 'flow-name',
      flowMode: 'parallel'
    };
    const expectedMessage = [
      'task "task-id" in flow{flow-name}:parallel has failed',
      'something went wrong'
    ].join(': ');

    const taskError = Utils.buildTaskError(cause, taskID, flowOpts);

    expect(taskError).toBeInstanceOf(Error);
    expect(taskError).toBeInstanceOf(VError);
    expect((taskError as VError).cause()).toBe(cause);
    expect(taskError.message).toBe(expectedMessage);
    expect(VError.info(taskError)).toEqual(expectedInfo);
  });
});
