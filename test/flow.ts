/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { it, expect, describe } from 'vitest';
import sinon from 'sinon';
import flow from '../src';
import { Flow, FlowOptions } from '../src/types';

const range = (from: number, to: number): number[] => Array.from({ length: to - from + 1 }, (_, i) => i + from);

interface TaskOptions {
  from: number;
  to: number;
  withCallback?: boolean;
  withPromise?: boolean;
}

const generateNumbersTasks = (from: number, to: number, { withCallback, withPromise }: Partial<TaskOptions> = {}) => {
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

describe('Flow', () => {
  it('should expose the flows factory functions', () => {
    expect(typeof flow.series).toBe('function');
    expect(typeof flow.waterfall).toBe('function');
    expect(typeof flow.parallel).toBe('function');
  });

  it('.series() should run its tasks serially', async () => {
    const tasks = generateNumbersTasks(1, 5);
    const testFlow = flow.series(tasks);
    const expectedResults = range(1, 5);

    const { results: actualResults, errors } = await testFlow.run();

    expect(actualResults).toEqual(expectedResults);
    expect(errors.length).toBe(0);
    range(1, 4).forEach(index => {
      const prevTask = tasks[index - 1];
      const nextTask = tasks[index];
      expect(prevTask.calledBefore(nextTask)).toBe(true);
    });
  });

  it('.waterfall() should run its tasks serially but pass previous result', async () => {
    const tasks = generateNumbersTasks(1, 5);
    const testFlow = flow.waterfall(tasks);
    const expectedResults = 5;

    const { results: actualResults, errors } = await testFlow.run();

    expect(actualResults).toBe(expectedResults);
    expect(errors.length).toBe(0);

    range(1, 4).forEach(index => {
      const prevTask = tasks[index - 1];
      const nextTask = tasks[index];
      expect(prevTask.calledBefore(nextTask)).toBe(true);
      expect(nextTask.args[0][1]).toBe(index);
    });
  });

  it('.parallel() should run its tasks concurrently', async () => {
    const tasks = generateNumbersTasks(1, 5);
    const testFlow = flow.parallel(tasks);
    const expectedResults = range(1, 5);

    const { results: actualResults, errors } = await testFlow.run();

    expect(actualResults).toEqual(expectedResults);
    expect(errors.length).toBe(0);
  });

  it('.waterfall() should return only the last result', async () => {
    const oneToFiveTasks = generateNumbersTasks(1, 5);
    const sixToTenTasks = generateNumbersTasks(6, 10);
    const testFlow = flow.waterfall([
      flow.parallel(oneToFiveTasks),
      flow.parallel(sixToTenTasks)
    ]);
    const expectedResults = range(6, 10);

    const { results: actualResults, errors } = await testFlow.run();

    expect(actualResults).toEqual(expectedResults);
    expect(errors.length).toBe(0);
  });

  it('any flow instance should allow to pipe additional flows', async () => {
    const oneToFiveFlow = flow.parallel(generateNumbersTasks(1, 5));
    const sixToTenFlow = flow.parallel(generateNumbersTasks(6, 10));
    const elevenToFifteenFlow = flow.parallel(generateNumbersTasks(11, 15));
    const testFlow = oneToFiveFlow
      .pipe(sixToTenFlow)
      .pipe(elevenToFifteenFlow);
    const expectedResults = range(11, 15);

    const { results: actualResults, errors } = await testFlow.run();

    expect(actualResults).toEqual(expectedResults);
    expect(errors.length).toBe(0);
    expect(testFlow).toBe(oneToFiveFlow);
  });

  it('any flow instance should allow to un-pipe a flow or all ones', async () => {
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

    expect(actualResultsRunOne).toEqual(expectedResults[1]);
    expect(actualResultsRunTwo).toEqual(range(1,5));
    expect(testFlow).toBe(oneToFiveFlow);
  });

  it('when a flow is provided as task it should be converted to task', async () => {
    const testFlow = flow.parallel([
      flow.parallel(generateNumbersTasks(1, 5)),
      flow.parallel(generateNumbersTasks(6, 10))
    ]);
    const expectedResults = [range(1, 5), range(6, 10)];

    const { results: actualResults } = await testFlow.run();

    expect(actualResults).toEqual(expectedResults);
  });

  it('tasks can be passed as an object', async () => {
    const tasks = {
      oneToFive: flow.parallel(generateNumbersTasks(1, 5)),
      sixToTen: flow.parallel(generateNumbersTasks(6, 10))
    };
    const testFlow = flow.parallel(tasks, { resultsAsArray: false });
    const expectedResults = {
      oneToFive: range(1, 5),
      sixToTen: range(6, 10)
    };

    const { results: actualResults } = await testFlow.run();

    expect(actualResults).toEqual(expectedResults);
  });

  it('should return results as array when passed resultsAsArray=true option', async () => {
    const tasks = {
      oneToFive: flow.parallel(generateNumbersTasks(1, 5)),
      sixToTen: flow.parallel(generateNumbersTasks(6, 10))
    };
    const testFlow = flow.parallel(tasks, { resultsAsArray: true });
    const expectedResults = [range(1, 5), range(6, 10)];

    const { results: actualResults } = await testFlow.run();

    expect(actualResults).toEqual(expectedResults);
  });

  it('.parallel() should abort flow execution on error when passed abortOnError=true option', async () => {
    const tasks = [
      sinon.stub().returns(1),
      sinon.stub().returns(Promise.reject(new Error('something went wrong'))),
      sinon.stub().returns(3)
    ];
    const testFlow = flow.parallel(tasks, { abortOnError: true, name: 'test-flow' });
    const expectedErrorMsg = 'task "1" in flow{test-flow}:parallel has failed: something went wrong';

    try {
      await testFlow.run();
      expect.fail('should have thrown');
    } catch (error: any) {
      expect(error.name).toBe('TaskError');
      expect(error.message).toBe(expectedErrorMsg);
      expect(tasks[2].called).toBe(true);
    }
  });

  it('.parallel() should not abort flow execution on error when passed abortOnError=false option', async () => {
    const tasks = [
      sinon.stub().returns(1),
      sinon.stub().returns(Promise.reject(new Error('something went wrong on task 1'))),
      sinon.stub().returns(Promise.reject(new Error('something went wrong on task 2'))),
      sinon.stub().returns(4)
    ];
    const testFlow = flow.parallel(tasks, { abortOnError: false, name: 'test-flow' });
    const expectedResults = [1, undefined, undefined, 4];

    const { results: actualResults, errors } = await testFlow.run();

    expect(actualResults).toEqual(expectedResults);
    expect(errors.length).toBe(2);
    expect(tasks[2].called).toBe(true);
    expect(tasks[3].called).toBe(true);
  });

  it('.series() should not abort flow execution on error when passed abortOnError=false option', async () => {
    const tasks = [
      sinon.stub().returns(1),
      sinon.stub().returns(Promise.reject(new Error('something went wrong on task 1'))),
      sinon.stub().returns(Promise.reject(new Error('something went wrong on task 2'))),
      sinon.stub().returns(4)
    ];
    const testFlow = flow.series(tasks, { abortOnError: false, name: 'test-flow' });
    const expectedResults = [1, undefined, undefined, 4];

    const { results: actualResults, errors } = await testFlow.run();

    expect(actualResults).toEqual(expectedResults);
    expect(errors.length).toBe(2);
    expect(tasks[2].called).toBe(true);
    expect(tasks[3].called).toBe(true);
  });

  it('.waterfall() should not abort flow execution on error when passed abortOnError=false option', async () => {
    const tasks = [
      sinon.stub().returns(1),
      sinon.stub().returns(Promise.reject(new Error('something went wrong on task 1'))),
      sinon.stub().returns(Promise.reject(new Error('something went wrong on task 2'))),
      sinon.stub().returns(4)
    ];
    const testFlow = flow.waterfall(tasks, { abortOnError: false, name: 'test-flow' });
    const expectedResults = 4;

    const { results: actualResults, errors } = await testFlow.run();

    expect(actualResults).toEqual(expectedResults);
    expect(errors.length).toBe(2);
    expect(tasks[2].called).toBe(true);
    expect(tasks[3].called).toBe(true);
  });

  it('.series() should abort flow execution on error when passed abortOnError=true option', async () => {
    const tasks = [
      sinon.stub().returns(1),
      sinon.stub().returns(Promise.reject(new Error('something went wrong'))),
      sinon.stub().returns(3)
    ];
    const testFlow = flow.series(tasks, { abortOnError: true, name: 'test-flow' });
    const expectedErrorMsg = 'task "1" in flow{test-flow}:series has failed: something went wrong';

    try {
      await testFlow.run();
      expect.fail('should have thrown');
    } catch (error: any) {
      expect(error.name).toBe('TaskError');
      expect(error.message).toBe(expectedErrorMsg);
      expect(tasks[2].called).toBe(false);
    }
  });

  it('.waterfall() should abort flow execution on error when passed abortOnError=true option', async () => {
    const tasks = [
      sinon.stub().returns(1),
      sinon.stub().returns(Promise.reject(new Error('something went wrong'))),
      sinon.stub().returns(3)
    ];
    const testFlow = flow.waterfall(tasks, { abortOnError: true, name: 'test-flow' });
    const expectedErrorMsg = 'task "1" in flow{test-flow}:waterfall has failed: something went wrong';

    try {
      await testFlow.run();
      expect.fail('should have thrown');
    } catch (error: any) {
      expect(error.name).toBe('TaskError');
      expect(error.message).toBe(expectedErrorMsg);
      expect(tasks[2].called).toBe(false);
    }
  });

  it('.waterfall() should extract the last result when last task is a flow with only one task', async () => {
    const tasks = [
      flow.parallel(generateNumbersTasks(1, 5)),
      flow.parallel([
        () => range(6, 10)
      ])
    ];
    const testFlow = flow.waterfall(tasks, { resultsAsArray: true });
    const expectedResults = range(6, 10);

    const { results: actualResults } = await testFlow.run();

    expect(actualResults).toEqual(expectedResults);
  });

  it('.waterfall() should not extract the last result when last task is a flow with multiple tasks', async () => {
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

    expect(actualResults).toEqual(expectedResults);
  });
});
