import test from 'ava';
import { range } from 'range';
import sinon from 'sinon';
import flow from '../../../lib/flow';

const generateNumbersTasks = (from, to) => {
  return range(from, to + 1)
    .map(number => sinon.stub().returns(number));
};

test('should expose the flows factory functions', t => {
  t.is(typeof flow, 'function', 'should expose the main flow function');
  t.is(typeof flow.series, 'function', '.series() should be a function');
  t.is(typeof flow.waterfall, 'function', '.waterfall() should be a function');
  t.is(typeof flow.parallel, 'function', '.parallel() should be a function');
});

test('flow.series() should run its tasks serially', async t => {
  const tasks = generateNumbersTasks(1, 5);
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
  const tasks = generateNumbersTasks(1, 5);
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
  const tasks = generateNumbersTasks(1, 5);
  const testFlow = flow.parallel(tasks);

  const expectedResults = [1, 2, 3, 4, 5];

  const result = await testFlow.run();

  t.deepEqual(result.results, expectedResults, 'should return results as an array');
  t.is(result.errors.length, 0, 'should return an empty errors array');
});

test('flow.waterfall() should return only the last result', async t => {
  const oneToFiveTasks = generateNumbersTasks(1, 5);
  const sixToTenTasks = generateNumbersTasks(6, 10);
  const oneToTenFlow = flow.waterfall([
    flow.parallel(oneToFiveTasks),
    flow.parallel(sixToTenTasks)
  ]);

  const expectedResults = [6, 7, 8, 9, 10];

  const result = await oneToTenFlow.run();

  t.deepEqual(result.results, expectedResults, 'should return results as an array');
  t.is(result.errors.length, 0, 'should return an empty errors array');
});

test('any flow instance should allow to pipe additional flows', async t => {
  const oneToFiveTasks = generateNumbersTasks(1, 5);
  const sixToTenTasks = generateNumbersTasks(6, 10);
  const elevenToFifteenTasks = generateNumbersTasks(11, 15);

  const oneToFiveFlow = flow.parallel(oneToFiveTasks);
  const sixToTenFlow = flow.parallel(sixToTenTasks);
  const elevenToFifteenFlow = flow.parallel(elevenToFifteenTasks);

  const pipedFlow = oneToFiveFlow
    .pipe(sixToTenFlow)
    .pipe(elevenToFifteenFlow);

  const expectedResults = [11, 12, 13, 14, 15];

  const result = await pipedFlow.run();

  t.deepEqual(result.results, expectedResults, 'should return results as an array');
  t.is(result.errors.length, 0, 'should return an empty errors array');
  t.is(pipedFlow === oneToFiveFlow, true, 'should return itself when piping flows');
});

test('any flow instance should allow to un-pipe a flow or all ones', async t => {
  const oneToFiveTasks = generateNumbersTasks(1, 5);
  const sixToTenTasks = generateNumbersTasks(6, 10);
  const elevenToFifteenTasks = generateNumbersTasks(11, 15);

  const oneToFiveFlow = flow.parallel(oneToFiveTasks);
  const sixToTenFlow = flow.parallel(sixToTenTasks);
  const elevenToFifteenFlow = flow.parallel(elevenToFifteenTasks);

  const pipedFlow = oneToFiveFlow
    .pipe(sixToTenFlow)
    .pipe(elevenToFifteenFlow)
    .unpipe(elevenToFifteenFlow);

  const expectedResults = [
    [1, 2, 3, 4, 5],
    [6, 7, 8, 9, 10]
  ];

  const resultOne = await pipedFlow.run();

  oneToFiveFlow.unpipe();

  const resultTwo = await pipedFlow.run();

  t.deepEqual(resultOne.results, expectedResults[1], 'should return results as an array');
  t.deepEqual(resultTwo.results, expectedResults[0], 'should return results as an array');
});

test('when a flow is provided as task it should be converted to task', async t => {
  const oneToFiveTasks = generateNumbersTasks(1, 5);
  const sixToTenTasks = generateNumbersTasks(6, 10);
  const oneToTenFlow = flow.parallel([
    flow.parallel(oneToFiveTasks),
    flow.parallel(sixToTenTasks)
  ]);

  const expectedResults = [[1, 2, 3, 4, 5], [6, 7, 8, 9, 10]];

  const result = await oneToTenFlow.run();

  t.deepEqual(result.results, expectedResults, 'should return results as an array');
  t.is(result.errors.length, 0, 'should return an empty errors array');
});

test('tasks can be passed as an object', async t => {
  const tasks = {
    oneToFive: flow.parallel(generateNumbersTasks(1, 5)),
    sixToTen: flow.parallel(generateNumbersTasks(6, 10))
  };
  const oneToTenFlow = flow.parallel(tasks);

  const expectedResults = {
    oneToFive: [1, 2, 3, 4, 5],
    sixToTen: [6, 7, 8, 9, 10]
  };

  const result = await oneToTenFlow.run();

  t.deepEqual(result.results, expectedResults, 'should return results as an object');
});

test('should return results as array when passed resultsAsArray: true option', async t => {
  const tasks = {
    oneToFive: flow.parallel(generateNumbersTasks(1, 5)),
    sixToTen: flow.parallel(generateNumbersTasks(6, 10))
  };
  const oneToTenFlow = flow.parallel(tasks, { resultsAsArray: true });

  const expectedResults = [
    [1, 2, 3, 4, 5],
    [6, 7, 8, 9, 10]
  ];

  const result = await oneToTenFlow.run();

  t.deepEqual(result.results, expectedResults, 'should return results as an object');
});
