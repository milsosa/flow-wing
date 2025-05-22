'use strict';

import isPlainObject from 'lodash.isplainobject';

/**
 * Extracts the last item if {results} is an array and returns it
 * or the {results} itself otherwise
 *
 * @param {Array|Object} results The Flow's execution results
 *
 * @returns {any} The last item if {results} is an array or {results} otherwise
 */
function extractLast(results: any[] | any): any {
  if (!Array.isArray(results)) {
    return results;
  }
  // .pop() can return undefined if the array is empty.
  // The original code didn't handle this, so we'll keep behavior consistent.
  return results.pop();
}

interface FlowOptions {
  resultsAsArray: boolean;
  mode: string;
  // Add other potential properties if known, or use an index signature
  // [key: string]: any; 
}

interface ResultsObject {
  [key: string]: any;
}

/**
 * Extracts the Flow's result(s) based on the provided options
 * and the running mode {series|waterfall|parallel}
 *
 * @param {Array|Object} results  The Flow's execution results
 * @param {Array}        tasksIDs The Flow's Tasks' ID ordered
 * @param {Object}       opts     The Flow's options
 *
 * @returns {any|any[]} The extracted result(s)
 */
function parse(results: ResultsObject | any[], tasksIDs: string[], opts: FlowOptions): any {
  let processedResults: any = results;

  if (opts.resultsAsArray && isPlainObject(processedResults) && !Array.isArray(processedResults)) {
    // Ensure results is treated as ResultsObject here for type safety
    const resultsObj = processedResults as ResultsObject;
    // Iterate over tasks' id to return the results orderly
    processedResults = tasksIDs.map((id: string) => resultsObj[id]);
  }

  if (Array.isArray(processedResults) && opts.mode === 'waterfall') {
    return extractLast(processedResults);
  }

  return processedResults;
}

export {
  parse,
  extractLast
};
