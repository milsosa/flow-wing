import * as Utils from '../utils';
import { ParseOptions, Results } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractLast(results: Results): any {
  if (!Array.isArray(results)) {
    return results;
  }
  return results.pop();
}

export function parse(results: Results, tasksIDs: string[], opts: ParseOptions): Results {
  const { resultsAsArray = true, mode = 'series' } = opts;
  let parsedResults = results;
  if (resultsAsArray && Utils.isPlainObject(parsedResults)) {
    // Iterate over tasks' id to return the results orderly
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
