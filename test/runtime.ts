/* eslint-disable @typescript-eslint/no-explicit-any */
import { it, expect, describe } from 'vitest';
import createRuntime from '../src/flow/runtime';
import { Flow } from '../src/types';

describe('Runtime', () => {
  it('should throw when an invalid runtime is provided', () => {
    const expectedErrorMatcher = /You must provide only the 'context' parameter.*/;
    expect(() => createRuntime({} as any, undefined, { name: 'test' } as any, {})).toThrowError(expectedErrorMatcher);
  });

  it('should return a new runtime when not provided an existing one', () => {
    const testFlow: Flow = { name: 'fake-flow' } as Flow;
    const context = { some: 'data' };
    const options = { some: 'options' };

    const runtime = createRuntime(undefined, context, testFlow, options);

    expect(runtime.context).toBe(context);
    expect(runtime.flow).toBe(testFlow);
    expect(runtime.opts).not.toBe(options);
    expect(runtime.opts).toEqual(options);
    expect(runtime.errors).toEqual([]);
  });

  it('should default to an empty object context when not provided', () => {
    const testFlow = { name: 'fake-flow' } as Flow;
    const options = { some: 'options' };

    const runtime = createRuntime(undefined, undefined, testFlow, options);

    expect(runtime.context).toEqual({});
  });
});
