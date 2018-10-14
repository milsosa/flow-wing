'use strict';

const isPlainObject = require('lodash.isplainobject');

/**
 * Extracts the last item if {results} is an array and returns it
 * or the {results} itself otherwise
 *
 * @param {Array|Object} results The Flow's execution results
 *
 * @returns {any} The last item if {results} is an array or {results} otherwise
 */
function extractLast(results) {
  if (!Array.isArray(results)) {
    return results;
  }

  return results.pop();
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
function parse(results, tasksIDs, opts) {
  if (opts.resultsAsArray && isPlainObject(results)) {
    // Iterate over tasks' id to return the results orderly
    results = tasksIDs.map(id => results[id]);
  }

  if (Array.isArray(results) && opts.mode === 'waterfall') {
    return extractLast(results);
  }

  return results;
}

module.exports = {
  parse,
  extractLast
};
