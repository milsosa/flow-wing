import test from 'ava';
import { range as generateRange } from 'range';
import sinon from 'sinon';
import flow from '../lib/flow';

const range = (from, to) => generateRange(from, to + 1);

const generateNumbersTasks = (from, to, { withCallback, withPromise } = {}) => {
  return range(from, to)
    .map(number => {
      const task = sinon.stub();

      if (withCallback) {
        task.yields(null, number);
      } else if (withPromise) {
        task.returns(Promise.resolve(number));
      } else {
        task.returns(number);
      }

      return task;
    });
};

// Tests macros

async function syncAndAsyncFlowTestMacro(t, flowFactoryFn, taskOpts, expectedResults) {
  const { from, to } = taskOpts;
  const testFlow = flowFactoryFn(generateNumbersTasks(from, to, taskOpts));

  const { results: actualResults } = await testFlow.run();

  t.deepEqual(actualResults, expectedResults);
}

syncAndAsyncFlowTestMacro.title = (flowType, _, taskOpts) => {
  let testTitle = `.${flowType}() should support `;

  if (taskOpts.withCallback) {
    testTitle += 'asynchronous tasks with callbacks';
  } else if (taskOpts.withPromise) {
    testTitle += 'asynchronous tasks with promises';
  } else {
    testTitle += 'synchronous tasks';
  }

  return testTitle;
};

async function unwWrapSingleTaskResultMacro(t, flowFactoryFn) {
  const testFlow = flowFactoryFn([
    () => Promise.resolve(range(1, 5))
  ]);
  const expectedResults = range(1, 5);

  const { results: actualResults } = await testFlow.run();

  t.deepEqual(actualResults, expectedResults);
}

unwWrapSingleTaskResultMacro.title = flowType =>
  `.${flowType}() should extract the result when it contains a single task`;

test('should expose the flows factory functions', t => {
  t.is(typeof flow, 'function', 'should expose the main flow function');
  t.is(typeof flow.series, 'function', '.series() should be a function');
  t.is(typeof flow.waterfall, 'function', '.waterfall() should be a function');
  t.is(typeof flow.parallel, 'function', '.parallel() should be a function');
});

test('.series() should run its tasks serially', async t => {
  const tasks = generateNumbersTasks(1, 5);
  const testFlow = flow.series(tasks);
  const expectedResults = range(1, 5);

  const { results: actualResults, errors } = await testFlow.run();

  t.deepEqual(actualResults, expectedResults, 'should return results as an array');
  t.is(errors.length, 0, 'should return an empty errors array');
  range(1, 4).forEach(index => {
    const prevTask = tasks[index - 1];
    const nextTask = tasks[index];

    t.is(prevTask.calledBefore(nextTask), true, 'the next task should be run after previous completes');
  });
});

test('.waterfall() should run its tasks serially but pass previous result', async t => {
  const tasks = generateNumbersTasks(1, 5);
  const testFlow = flow.waterfall(tasks);
  const expectedResults = 5;

  const { results: actualResults, errors } = await testFlow.run();

  t.is(actualResults, expectedResults, 'should return only the last task result');
  t.is(errors.length, 0, 'should return an empty errors array');

  range(1, 4).forEach(index => {
    const prevTask = tasks[index - 1];
    const nextTask = tasks[index];

    t.is(prevTask.calledBefore(nextTask), true, 'the next task should be run after previous completes');
    t.is(nextTask.args[0][1], index, 'the next task should receive the previous task result');
  });
});

test('.parallel() should run its tasks concurrently', async t => {
  const tasks = generateNumbersTasks(1, 5);
  const testFlow = flow.parallel(tasks);
  const expectedResults = range(1, 5);

  const { results: actualResults, errors } = await testFlow.run();

  t.deepEqual(actualResults, expectedResults, 'should return results as an array');
  t.is(errors.length, 0, 'should return an empty errors array');
});

test('.waterfall() should return only the last result', async t => {
  const oneToFiveTasks = generateNumbersTasks(1, 5);
  const sixToTenTasks = generateNumbersTasks(6, 10);
  const testFlow = flow.waterfall([
    flow.parallel(oneToFiveTasks),
    flow.parallel(sixToTenTasks)
  ]);
  const expectedResults = range(6, 10);

  const { results: actualResults, errors } = await testFlow.run();

  t.deepEqual(actualResults, expectedResults, 'should return results as an array');
  t.is(errors.length, 0, 'should return an empty errors array');
});

test('series', syncAndAsyncFlowTestMacro, flow.series, { from: 1, to: 5 }, range(1, 5));
test('series', syncAndAsyncFlowTestMacro, flow.series, { from: 1, to: 5, withCallback: true }, range(1, 5));
test('series', syncAndAsyncFlowTestMacro, flow.series, { from: 1, to: 5, withPromise: true }, range(1, 5));

test('waterfall', syncAndAsyncFlowTestMacro, flow.waterfall, { from: 1, to: 5 }, 5);
test('waterfall', syncAndAsyncFlowTestMacro, flow.waterfall, { from: 1, to: 5, withCallback: true }, 5);
test('waterfall', syncAndAsyncFlowTestMacro, flow.waterfall, { from: 1, to: 5, withPromise: true }, 5);

test('parallel', syncAndAsyncFlowTestMacro, flow.parallel, { from: 1, to: 5 }, range(1, 5));
test('parallel', syncAndAsyncFlowTestMacro, flow.parallel, { from: 1, to: 5, withCallback: true }, range(1, 5));
test('parallel', syncAndAsyncFlowTestMacro, flow.parallel, { from: 1, to: 5, withPromise: true }, range(1, 5));

test('any flow instance should allow to pipe additional flows', async t => {
  const oneToFiveFlow = flow.parallel(generateNumbersTasks(1, 5));
  const sixToTenFlow = flow.parallel(generateNumbersTasks(6, 10));
  const elevenToFifteenFlow = flow.parallel(generateNumbersTasks(11, 15));
  const testFlow = oneToFiveFlow
    .pipe(sixToTenFlow)
    .pipe(elevenToFifteenFlow);
  const expectedResults = range(11, 15);

  const { results: actualResults, errors } = await testFlow.run();

  t.deepEqual(actualResults, expectedResults, 'should return results as an array');
  t.is(errors.length, 0, 'should return an empty errors array');
  t.is(testFlow === oneToFiveFlow, true, 'should return itself when piping flows');
});

test('any flow instance should allow to un-pipe a flow or all ones', async t => {
  const oneToFiveFlow = flow.parallel(generateNumbersTasks(1, 5));
  const sixToTenFlow = flow.parallel(generateNumbersTasks(6, 10));
  const elevenToFifteenFlow = flow.parallel(generateNumbersTasks(11, 15));
  const testFlow = oneToFiveFlow
    .pipe(sixToTenFlow)
    .pipe(elevenToFifteenFlow);
  const expectedResults = [range(1, 5), range(6, 10)];

  testFlow.unpipe(elevenToFifteenFlow);

  const { results: actualResultsRunOne } = await testFlow.run();

  oneToFiveFlow.unpipe();

  const { results: actualResultsRunTwo } = await testFlow.run();

  t.deepEqual(actualResultsRunOne, expectedResults[1], 'should return results as an array');
  t.deepEqual(actualResultsRunTwo, expectedResults[0], 'should return results as an array');
  t.is(testFlow === oneToFiveFlow, true, 'should return itself when piping flows');
});

test('when a flow is provided as task it should be converted to task', async t => {
  const testFlow = flow.parallel([
    flow.parallel(generateNumbersTasks(1, 5)),
    flow.parallel(generateNumbersTasks(6, 10))
  ]);
  const expectedResults = [range(1, 5), range(6, 10)];

  const { results: actualResults } = await testFlow.run();

  t.deepEqual(actualResults, expectedResults, 'should return results as an array');
});

test('tasks can be passed as an object', async t => {
  const tasks = {
    oneToFive: flow.parallel(generateNumbersTasks(1, 5)),
    sixToTen: flow.parallel(generateNumbersTasks(6, 10))
  };
  const testFlow = flow.parallel(tasks);
  const expectedResults = {
    oneToFive: range(1, 5),
    sixToTen: range(6, 10)
  };

  const { results: actualResults } = await testFlow.run();

  t.deepEqual(actualResults, expectedResults, 'should return results as an object');
});

test('should return results as array when passed resultsAsArray=true option', async t => {
  const tasks = {
    oneToFive: flow.parallel(generateNumbersTasks(1, 5)),
    sixToTen: flow.parallel(generateNumbersTasks(6, 10))
  };
  const testFlow = flow.parallel(tasks, { resultsAsArray: true });
  const expectedResults = [range(1, 5), range(6, 10)];

  const { results: actualResults } = await testFlow.run();

  t.deepEqual(actualResults, expectedResults, 'should return results as an array');
});

test('.parallel() should abort flow execution on error when passed abortOnError=true option', async t => {
  const tasks = [
    sinon.stub().returns(1),
    sinon.stub().returns(Promise.reject(new Error('something went wrong'))),
    sinon.stub().returns(3)
  ];
  const testFlow = flow.parallel(tasks, { abortOnError: true, name: 'test-flow' }, Error);
  const expectedErrorMsg = 'task "1" in flow{test-flow}:parallel has failed: something went wrong';

  const error = await t.throws(testFlow.run());

  t.is(error.name, 'TaskError', 'should be TaskError instance');
  t.is(error.message, expectedErrorMsg);
  t.is(tasks[2].called, true, 'since it is parallel will call all tasks concurrently');
});

test('.parallel() should not abort flow execution on error when passed abortOnError=false option', async t => {
  const tasks = [
    sinon.stub().returns(1),
    sinon.stub().returns(Promise.reject(new Error('something went wrong on task 1'))),
    sinon.stub().returns(Promise.reject(new Error('something went wrong on task 2'))),
    sinon.stub().returns(4)
  ];
  const testFlow = flow.parallel(tasks, { abortOnError: false, name: 'test-flow' }, Error);
  const expectedResults = [1, undefined, undefined, 4];

  const { results: actualResults, errors } = await testFlow.run();

  t.deepEqual(actualResults, expectedResults);
  t.is(errors.length, 2, 'should return the occurred errors');
  t.is(tasks[2].called, true);
  t.is(tasks[3].called, true);
});

test('.series() should not abort flow execution on error when passed abortOnError=false option', async t => {
  const tasks = [
    sinon.stub().returns(1),
    sinon.stub().returns(Promise.reject(new Error('something went wrong on task 1'))),
    sinon.stub().returns(Promise.reject(new Error('something went wrong on task 2'))),
    sinon.stub().returns(4)
  ];
  const testFlow = flow.series(tasks, { abortOnError: false, name: 'test-flow' }, Error);
  const expectedResults = [1, undefined, undefined, 4];

  const { results: actualResults, errors } = await testFlow.run();

  t.deepEqual(actualResults, expectedResults);
  t.is(errors.length, 2, 'should return the occurred errors');
  t.is(tasks[2].called, true);
  t.is(tasks[3].called, true);
});

test('.waterfall() should not abort flow execution on error when passed abortOnError=false option', async t => {
  const tasks = [
    sinon.stub().returns(1),
    sinon.stub().returns(Promise.reject(new Error('something went wrong on task 1'))),
    sinon.stub().returns(Promise.reject(new Error('something went wrong on task 2'))),
    sinon.stub().returns(4)
  ];
  const testFlow = flow.waterfall(tasks, { abortOnError: false, name: 'test-flow' }, Error);
  const expectedResults = 4;

  const { results: actualResults, errors } = await testFlow.run();

  t.deepEqual(actualResults, expectedResults);
  t.is(errors.length, 2, 'should return the occurred errors');
  t.is(tasks[2].called, true);
  t.is(tasks[3].called, true);
});

test('.series() should abort flow execution on error when passed abortOnError=true option', async t => {
  const tasks = [
    sinon.stub().returns(1),
    sinon.stub().returns(Promise.reject(new Error('something went wrong'))),
    sinon.stub().returns(3)
  ];
  const testFlow = flow.series(tasks, { abortOnError: true, name: 'test-flow' }, Error);
  const expectedErrorMsg = 'task "1" in flow{test-flow}:series has failed: something went wrong';

  const error = await t.throws(testFlow.run());

  t.is(error.name, 'TaskError', 'should be TaskError instance');
  t.is(error.message, expectedErrorMsg);
  t.is(tasks[2].called, false, 'should not call the next task');
});

test('.waterfall() should abort flow execution on error when passed abortOnError=true option', async t => {
  const tasks = [
    sinon.stub().returns(1),
    sinon.stub().returns(Promise.reject(new Error('something went wrong'))),
    sinon.stub().returns(3)
  ];
  const testFlow = flow.waterfall(tasks, { abortOnError: true, name: 'test-flow' }, Error);
  const expectedErrorMsg = 'task "1" in flow{test-flow}:waterfall has failed: something went wrong';

  const error = await t.throws(testFlow.run());

  t.is(error.name, 'TaskError', 'should be TaskError instance');
  t.is(error.message, expectedErrorMsg);
  t.is(tasks[2].called, false, 'should not call the next task');
});

test('.waterfall() should extract the last result when last task is a flow with only one task', async t => {
  const tasks = [
    flow.parallel(generateNumbersTasks(1, 5)),
    flow.parallel([
      () => range(6, 10)
    ])
  ];
  const testFlow = flow.waterfall(tasks, { resultsAsArray: true });
  const expectedResults = range(6, 10);

  const { results: actualResults } = await testFlow.run();

  t.deepEqual(actualResults, expectedResults, 'should return results as an array');
});

test('.waterfall() should not extract the last result when last task is a flow with multiple tasks', async t => {
  const tasks = [
    flow.parallel(generateNumbersTasks(1, 5)),
    flow.parallel([
      () => range(6, 10),
      () => range(11, 15)
    ])
  ];
  const testFlow = flow.waterfall(tasks, { resultsAsArray: true });
  const expectedResults = [range(6, 10), range(11, 15)];

  const { results: actualResults } = await testFlow.run();

  t.deepEqual(actualResults, expectedResults, 'should return results as an array');
});

test('series', unwWrapSingleTaskResultMacro, flow.series);
test('parallel', unwWrapSingleTaskResultMacro, flow.parallel);
test('waterfall', unwWrapSingleTaskResultMacro, flow.waterfall);
