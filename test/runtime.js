import test from 'ava';
import createRuntime from '../lib/flow/runtime';

test('should throw when an invalid runtime is provided', t => {
  const expectedErrorMatcher = /^You must provide only the "context" parameter.*/;

  t.throws(() => createRuntime({}), Error, expectedErrorMatcher);
});

test('should return a new runtime when not provided an existing one', t => {
  const testFlow = { name: 'fake-flow' };
  const context = { some: 'data' };
  const options = { some: 'options' };

  const runtime = createRuntime(undefined, context, testFlow, options);

  t.is(runtime.context, context, 'should use the provided context');
  t.is(runtime.flow, testFlow, 'should contain the provided flow instance');
  t.not(runtime.opts, options, 'should clone the provided options');
  t.deepEqual(runtime.opts, options, 'should clone the provided options');
  t.deepEqual(runtime.errors, [], 'should contain an empty errors array');
});

test('should default to an empty object context when not provided', t => {
  const testFlow = { name: 'fake-flow' };
  const options = { some: 'options' };

  const runtime = createRuntime(undefined, undefined, testFlow, options);

  t.deepEqual(runtime.context, {});
});
