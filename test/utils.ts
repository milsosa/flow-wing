import test from 'ava';
import VError from 'verror';
import flow from '../lib/flow'; // Corrected import
import Utils from '../lib/utils';

const { Task } = flow; // Access Task via flow

test('.isPromise() should return true when a task is passed', t => {
  const promise = Promise.resolve(true);

  t.true(Utils.isPromise(promise), 'should return true when passed a promise');
  t.false(Utils.isPromise(() => {}), 'should return false when passed a function');
  t.false(Utils.isPromise({}), 'should return false when passed an object');
});

test('.isFunction() should return true when a function is passed', t => {
  t.true(Utils.isFunction(() => {}), 'should return true for a function');
  t.false(Utils.isFunction({}), 'should return true for an object');
});

test('.isTask() should return true when a task instance is passed', t => {
  const task = Task.create(() => {});

  t.true(Utils.isTask(task), 'should return true for a task');
  t.false(Utils.isTask(() => {}), 'should return false for a normal function');
  t.false(Utils.isTask({}), 'should return false for an object');
});

test('.isFlow() should return true when a flow instance is passed', t => {
  const task = Task.create(() => {});
  const testFlow = flow([task]);

  t.true(Utils.isFlow(testFlow), 'should return true for a flow');
  t.false(Utils.isFlow(() => {}), 'should return false for a normal function');
  t.false(Utils.isFlow({}), 'should return false for an object');
});

test('.buildTaskError() should build a TaskError that includes the passed cause', t => {
  const cause = new Error('something went wrong');
  const taskID = 'task-id';
  const flowOpts = { name: 'flow-name', mode: 'parallel' };
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

  t.is(taskError instanceof Error, true, 'should be an Error instance');
  t.is(taskError instanceof VError, true, 'should be a VError instance');
  t.is(taskError.cause(), cause, '.cause() should return the original error cause');
  t.is(taskError.message, expectedMessage, 'should include the error cause in the message');
  t.deepEqual(VError.info(taskError), expectedInfo, 'should include the flow and task info');
});
