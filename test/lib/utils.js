import test from 'ava';

const VError = require('verror');
const Utils = require('../../lib/utils');
const flow = require('../../lib/flow');

const Task = flow.Task;

test('.isPromise()', t => {
  const promise = Promise.resolve(true);

  t.true(Utils.isPromise(promise), 'should return true when passed a promise');
  t.false(Utils.isPromise(() => {}), 'should return false when passed a function');
  t.false(Utils.isPromise({}), 'should return false when passed an object');
});

test('.isFunction()', t => {
  t.true(Utils.isFunction(() => {}), 'should return true for a function');
  t.false(Utils.isFunction({}), 'should return true for an object');
});

test('.isTask()', t => {
  const task = Task.create(() => {});

  t.true(Utils.isTask(task), 'should return true for a task');
  t.false(Utils.isTask(() => {}), 'should return false for a normal function');
  t.false(Utils.isTask({}), 'should return false for an object');
});

test('.isFlow()', t => {
  const task = Task.create(() => {});
  const testFlow = flow([task]);

  t.true(Utils.isFlow(testFlow), 'should return true for a flow');
  t.false(Utils.isFlow(() => {}), 'should return false for a normal function');
  t.false(Utils.isFlow({}), 'should return false for an object');
});

test('.restArgs()', t => {
  const fn = function (skip) {
    return Utils.restArgs(arguments, skip);
  };

  t.is(Array.isArray(fn(1, 'arg1')), true, 'should return an array');
  t.is(fn(1, 'arg1').length, 1, 'should return an array with the rest of arguments');
  t.is(fn(2, 'arg1', 'arg2').length, 1, 'should return an array with the rest of arguments');
});

test('.buildTaskError()', t => {
  const cause = new Error('something went wrong');
  const taskID = 'task-id';
  const flowOpts = { name: 'flow-name', mode: 'parallel' };
  const taskError = Utils.buildTaskError(cause, taskID, flowOpts);

  const expectedInfo = {
    taskID: 'task-id',
    flowName: 'flow-name',
    flowMode: 'parallel'
  };
  const expectedMessage = [
    `task "task-id" in flow{flow-name}:parallel has failed`,
    'something went wrong'
  ].join(': ');

  t.is(taskError instanceof Error, true, 'should be an Error instance');
  t.is(taskError instanceof VError, true, 'should be a VError instance');
  t.is(taskError.cause(), cause, '.cause() should return the original error cause');
  t.is(taskError.message, expectedMessage, 'should include the error cause in the message');
  t.deepEqual(VError.info(taskError), expectedInfo, 'should include the flow and task info');
});
