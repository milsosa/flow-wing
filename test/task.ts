import { it, expect, describe } from 'vitest';
import sinon from 'sinon';
import Task from '../src/flow/task';

describe('Task', () => {
  it('should expose the static .create() method', () => {
    expect(typeof Task.create).toBe('function');
  });

  it('.create() should allow to pass task specific arguments', async () => {
    const handler = (ctx: any, arg1: number, arg2: number) => arg1 + arg2;
    const task = Task.create('handler', handler, 5, 5);
    const expectedResult = 10;
    const actualResult = await task.run({});
    expect(actualResult).toBe(expectedResult);
  });

  it('.create() should assign the provided id to the task', () => {
    const handler = (ctx: any) => ctx;
    const task = Task.create('my-awesome-task', handler);
    expect(task.id).toBe('my-awesome-task');
  });

  it('.create() should throw when a non function handler is provided', () => {
    const invalidHandler = {};
    const expectedErrorMsg = 'The task handler should be a function, got "object"';
    expect(() => Task.create('task', invalidHandler as any)).toThrowError(expectedErrorMsg);
  });

  it('should allow to pipe additional handlers', async () => {
    const handler = (ctx: any, arg1: number, arg2: number) => arg1 + arg2;
    const pipeHandler = (ctx: any, prevResult: number, arg1: number) => prevResult + arg1;
    const task = Task.create('handler', handler, 5, 5).pipe(pipeHandler, 5);
    const expectedResult = 15;
    const actualResult = await task.run({});
    expect(actualResult).toBe(expectedResult);
  });

  it('.run() should pass the provided context to its handler(s)', async () => {
    const handler = sinon.stub().returnsArg(0);
    const pipeHandler = sinon.stub().returnsArg(0);
    const task = Task.create('handler', handler).pipe(pipeHandler);
    const context = { some: 'data' };
    const expectedResult = context;
    const actualResult = await task.run(context);
    expect(actualResult).toEqual(expectedResult);
    expect(handler.called).toBe(true);
    expect(pipeHandler.called).toBe(true);
  });

  it('.run() should pass the provided initial value to its handler(s)', async () => {
    const handler = sinon.stub().returnsArg(1);
    const pipeHandler = sinon.stub().returnsArg(1);
    const task = Task.create('handler', handler).pipe(pipeHandler);
    const initialValue = 'initial value';
    const expectedResult = initialValue;
    const actualResult = await task.run({}, initialValue);
    expect(actualResult).toEqual(expectedResult);
    expect(handler.called).toBe(true);
    expect(pipeHandler.called).toBe(true);
  });

  it('.run() should reject the promise when handler(s) calls callback with error', async () => {
    const handlerError = new Error('something went wrong');
    const handler = sinon.stub().yields(handlerError);
    const task = Task.create('handler', handler);
    await expect(task.run({})).rejects.toThrow(handlerError);
  });

  it('.run() should reject the promise when handler(s) return a rejected promise', async () => {
    const handlerError = new Error('something went wrong');
    const handler = sinon.stub().returns(Promise.reject(handlerError));
    const task = Task.create('handler', handler);
    await expect(task.run({})).rejects.toThrow(handlerError);
  });
});
