import test from 'ava';

const flow = require('../../../lib/flow');

// const Task = flow.Task;

test('should expose the flows factory functions', t => {
  t.is(typeof flow, 'function', 'should expose the main flow function');
  t.is(typeof flow.series, 'function', '.series should be a function');
  t.is(typeof flow.waterfall, 'function', '.waterfall should be a function');
  t.is(typeof flow.parallel, 'function', '.parallel should be a function');
});

test('should expose the flows factory functions', t => {
  t.is(typeof flow, 'function', 'should expose the main flow function');
  t.is(typeof flow.series, 'function', '.series should be a function');
  t.is(typeof flow.waterfall, 'function', '.waterfall should be a function');
  t.is(typeof flow.parallel, 'function', '.parallel should be a function');
});
