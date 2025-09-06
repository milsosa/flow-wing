import { isPlainObject } from '../utils';
import { ParseOptions, Results } from '../types';

export function extractLast(results: Results): any {
  if (!Array.isArray(results)) {
    return results;
  }
  return results.pop();
}

export function parse(results: Results, tasksIDs: string[], opts: ParseOptions): Results {
  const { resultsAsArray = true, mode = 'series' } = opts;
  let parsedResults = results;
  if (resultsAsArray && isPlainObject(parsedResults)) {
    // Iterate over tasks' id to return the results orderly
    parsedResults = tasksIDs.map(id => (parsedResults as Record<string, any>)[id]);
  }

  if (Array.isArray(parsedResults) && mode === 'waterfall') {
    return extractLast(parsedResults);
  }

  return parsedResults;
}

export default {
  parse,
  extractLast
};
