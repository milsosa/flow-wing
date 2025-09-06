import { Flow, Runtime, privateMark } from '../types';

function createRuntime(
  currentRuntime: Runtime | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any,
  flow: Flow,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  opts: any
): Runtime {
  if (currentRuntime && !currentRuntime[privateMark]) {
    const errorMsg = `You must provide only the 'context' parameter to the .run() method for the flow '${opts.name}'`;
    throw new Error(errorMsg);
  }

  // Current flow is being executed as task or piped
  // into another flow, so use its runtime
  if (currentRuntime) {
    return currentRuntime;
  }

  // Flow is being executed alone, so create its own runtime
  return {
    flow, // The main flow instance
    [privateMark]: true,
    opts: { ...opts },
    context: context || {},
    errors: []
  };
}

export default createRuntime;
