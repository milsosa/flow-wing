import test from 'ava';
import Results from '../lib/flow/results';

test('should expose .parse() and .extractLast() methods', t => {
  t.is(typeof Results.parse, 'function');
  t.is(typeof Results.extractLast, 'function');
});

test('.extractLast() should return the last item from the provided results', t => {
  const last = Results.extractLast([1, 2, 3]);

  t.is(last, 3);
});

test('.extractLast() should return the provided argument when it is not an array', t => {
  const value = { some: 'object' };

  const last = Results.extractLast(value);

  t.is(last, value);
});

test('.parse() should convert the results to when resultsAsArray=true', t => {
  const results = { task1: 1, task2: 2, task3: 3 };
  const tasksIDs = Object.keys(results);
  const expectedResults = [1, 2, 3];

  const actualResults = Results.parse(results, tasksIDs, { resultsAsArray: true });

  t.deepEqual(actualResults, expectedResults);
});

test('.parse() should return the last result when options.mode=waterfall', t => {
  const results = { task1: 1, task2: 2, task3: 3 };
  const tasksIDs = Object.keys(results);
  const options = { resultsAsArray: true, mode: 'waterfall' };
  const expectedResults = 3;

  const actualResults = Results.parse(results, tasksIDs, options);

  t.deepEqual(actualResults, expectedResults);
});
