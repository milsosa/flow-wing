import { it, expect, describe } from 'vitest';
import Results from '../src/flow/results';
import { ParseOptions } from '../src/types';

describe('Results', () => {
  it('should expose .parse() and .extractLast() methods', () => {
    expect(typeof Results.parse).toBe('function');
    expect(typeof Results.extractLast).toBe('function');
  });

  it('.extractLast() should return the last item from the provided results', () => {
    const last = Results.extractLast([1, 2, 3]);
    expect(last).toBe(3);
  });

  it('.extractLast() should return the provided argument when it is not an array', () => {
    const value = { some: 'object' };
    const last = Results.extractLast(value);
    expect(last).toBe(value);
  });

  it('.parse() should convert the results to when resultsAsArray=true', () => {
    const results = { task1: 1, task2: 2, task3: 3 };
    const tasksIDs = Object.keys(results);
    const expectedResults = [1, 2, 3];
    const actualResults = Results.parse(results, tasksIDs, { resultsAsArray: true, mode: 'series' });
    expect(actualResults).toEqual(expectedResults);
  });

  it('.parse() should return the last result when options.mode=waterfall', () => {
    const results = { task1: 1, task2: 2, task3: 3 };
    const tasksIDs = Object.keys(results);
    const options: ParseOptions = { resultsAsArray: true, mode: 'waterfall' };
    const expectedResults = 3;
    const actualResults = Results.parse(results, tasksIDs, options);
    expect(actualResults).toEqual(expectedResults);
  });
});
