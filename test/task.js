import test from 'ava';
import sinon from 'sinon';
import Task from '../lib/flow/task';

test('should expose the static .create() method', t => {
  t.is(typeof Task.create, 'function', 'Task.create should be a function');
});

test('.create() should allow to pass task specific arguments', async t => {
  const handler = (ctx, arg1, arg2) => arg1 + arg2;
  const task = Task.create(handler, 5, 5);
  const expectedResult = 10;

  const actualResult = await task.run({});

  t.is(actualResult, expectedResult);
});

test('.create() should assign the provided id to the task', t => {
  const handler = ctx => ctx;

  const task = Task.create('my-awesome-task', handler);

  t.is(task.id, 'my-awesome-task');
});

test('.create() should use the handler/function name when id was not provided', t => {
  function handler(ctx) {
    return ctx;
  }

  const task = Task.create(handler);

  t.is(task.id, 'handler');
});

test('.create() should throw when a non function handler is provided', t => {
  const invalidHandler = {};
  const expectedErrorMsg = 'The task handler should be a function, got "object"';

  const error = t.throws(() => Task.create(invalidHandler), TypeError);

  t.is(error.message, expectedErrorMsg);
});

test('should allow to pipe additional handlers', async t => {
  const handler = (ctx, arg1, arg2) => arg1 + arg2;
  const pipeHandler = (ctx, prevResult, arg1) => prevResult + arg1;
  const task = Task.create(handler, 5, 5).pipe(pipeHandler, 5);
  const expectedResult = 15;

  const actualResult = await task.run({});

  t.is(actualResult, expectedResult);
});

test('.run() should pass the provided context to its handler(s)', async t => {
  const handler = sinon.stub().returnsArg(0);
  const pipeHandler = sinon.stub().returnsArg(0);
  const task = Task.create(handler).pipe(pipeHandler);
  const context = { some: 'data' };
  const expectedResult = context;

  const actualResult = await task.run(context);

  t.deepEqual(actualResult, expectedResult);
  t.is(handler.called, true);
  t.is(pipeHandler.called, true);
});

test('.run() should pass the provided initial value to its handler(s)', async t => {
  const handler = sinon.stub().returnsArg(1);
  const pipeHandler = sinon.stub().returnsArg(1);
  const task = Task.create(handler).pipe(pipeHandler);
  const initialValue = 'initial value';
  const expectedResult = initialValue;

  const actualResult = await task.run({}, initialValue);

  t.deepEqual(actualResult, expectedResult);
  t.is(handler.called, true);
  t.is(pipeHandler.called, true);
});

test('.run() should reject the promise when handler(s) calls callback with error', async t => {
  const handlerError = new Error('something went wrong');
  const handler = sinon.stub().yields(handlerError);
  const task = Task.create(handler);

  const actualError = await t.throwsAsync(() => task.run({}));

  t.is(actualError, handlerError);
});

test('.run() should reject the promise when handler(s) return a rejected promise', async t => {
  const handlerError = new Error('something went wrong');
  const handler = sinon.stub().returns(Promise.reject(handlerError));
  const task = Task.create(handler);

  const actualError = await t.throwsAsync(() => task.run({}));

  t.is(actualError, handlerError);
});
