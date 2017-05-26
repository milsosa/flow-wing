'use strict';

const defaults = require('lodash.defaults');

const privateMark = Symbol('@private_runtime_mark');

/**
 * Creates a new runtime if {currentRuntime} is `undefined`
 *
 * If it is not `undefined`, validates that it is a valid one
 * and throws an error otherwise
 *
 * @param {Object} currentRuntime The current runtime object
 * @param {Object} context        The main Flow's context
 * @param {Object} flow           The main Flow's instance
 * @param {Object} opts           The main Flow's options
 */
function createRuntime(currentRuntime, context, flow, opts) {
  if (currentRuntime && !currentRuntime[privateMark]) {
    throw new Error([
      `You must provide only the "context" parameter`,
      `to the .run() method for the flow "${opts.name}"`
    ].join(' '));
  }

  // Current flow is being runned as task or piped
  // into another flow, so use its runtime
  if (currentRuntime) {
    return currentRuntime;
  }

  // Flow is being runned alone, so create its own runtime
  return {
    flow, // The main flow instance
    [privateMark]: true,
    opts: defaults({}, opts),
    context: context || {},
    errors: []
  };
}

module.exports = createRuntime;