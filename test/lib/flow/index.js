import test from 'ava';

const range = require('range').range;
const sinon = require('sinon');
const flow = require('../../../lib/flow');

// const Task = flow.Task;

test('should expose the flows factory functions', t => {
  t.is(typeof flow, 'function', 'should expose the main flow function');
  t.is(typeof flow.series, 'function', '.series should be a function');
  t.is(typeof flow.waterfall, 'function', '.waterfall should be a function');
  t.is(typeof flow.parallel, 'function', '.parallel should be a function');
});

test('flow.series() should run its tasks serially', async t => {
  const tasks = range(1, 6).map(number => sinon.stub().returns(number));
  const testFlow = flow.series(tasks);

  const expectedResults = [1, 2, 3, 4, 5];

  const result = await testFlow.run();

  t.deepEqual(result.results, expectedResults, 'should return results as an array');
  t.is(result.errors.length, 0, 'should return an empty errors array');

  range(1, 5).forEach(index => {
    const prevTask = tasks[index - 1];
    const nextTask = tasks[index];

    t.is(prevTask.calledBefore(nextTask), true, 'the next task should be run after previous completes');
  });
});

test('flow.waterfall() should run its tasks serially but pass previous result', async t => {
  const tasks = range(1, 6).map(number => sinon.stub().returns(number));
  const testFlow = flow.waterfall(tasks);

  const result = await testFlow.run();

  t.is(result.results, 5, 'should return only the last task result');
  t.is(result.errors.length, 0, 'should return an empty errors array');

  range(1, 5).forEach(index => {
    const prevTask = tasks[index - 1];
    const nextTask = tasks[index];

    t.is(prevTask.calledBefore(nextTask), true, 'the next task should be run after previous completes');
    t.is(nextTask.args[0][1], index, 'the next task should receive the previous task result');
  });
});

test('flow.parallel() should run its tasks concurrently', async t => {
  const tasks = range(1, 6).map(number => sinon.stub().returns(number));
  const testFlow = flow.parallel(tasks);

  const expectedResults = [1, 2, 3, 4, 5];

  const result = await testFlow.run();

  t.deepEqual(result.results, expectedResults, 'should return results as an array');
  t.is(result.errors.length, 0, 'should return an empty errors array');
});
