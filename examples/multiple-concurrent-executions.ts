'use strict';

import VError from 'verror';
import flow from '../lib';
import type { Flow, Task } from '../lib'; // Import Flow and Task types
import { getDelayFactor, tapLog } from './utils'; // Named import

// Re-define or import shared types
interface Options {
  resultsAsArray: boolean;
  abortOnError: boolean;
  concurrency: number;
  name?: string;
}

interface DelayContext {
  delay: number;
}

type CallbackFunction = (err: VError | null, result?: number) => void; // Use VError

const options: Options = {
  resultsAsArray: true,
  abortOnError: false,
  concurrency: 5
};

interface MainContext { // Defined MainContext
  some: string;
  delay: number;
}

const mainContext: MainContext = { // Typed context
  some: 'data',
  delay: getDelayFactor()
};

const getOptions = (opts: Options, name: string): Options => Object.assign({}, opts, { name });

const delayed = (number: number) => (ctx: DelayContext, previousResult: any, cb?: CallbackFunction) => {
  const actualCb: CallbackFunction = cb || (previousResult as CallbackFunction);
  const delay = number * ctx.delay;
  setTimeout(() => {
    if (number === 3) {
      return actualCb(new VError('something went wrong with task ' + number)); // Use VError
    }
    actualCb(null, number);
  }, delay);
};

const oneToFive: Flow = flow.parallel({ // Typed oneToFive
  one: delayed(1),
  two: delayed(2),
  three: delayed(3),
  four: delayed(4),
  five: delayed(5)
}, getOptions(options, 'oneToFive'));

const tasks: Task[] = [ // Typed tasks array
  oneToFive.asTask().pipe(tapLog('oneToFive1')),
  oneToFive.asTask().pipe(tapLog('oneToFive2')),
  oneToFive.asTask().pipe(tapLog('oneToFive3')),
  oneToFive.asTask().pipe(tapLog('oneToFive4')),
  oneToFive.asTask().pipe(tapLog('oneToFive5'))
];

const testFlow: Flow = flow.parallel(tasks, getOptions(options, 'mainFlow')); // Typed testFlow

interface FlowExecutionResult {
  errors: VError[]; // Typed errors
  results: any; // Results can be complex, using any for now
  context: MainContext;
}

for (let i = 1; i <= 5; i++) {
  testFlow.run(mainContext) // Use typed context
    .then((data: FlowExecutionResult) => { // Typed data
      console.log('execution %d finished with %d errors', i, data.errors.length);
      console.log('execution %d results:', i, data.results);
    })
    .catch((error: Error) => { // Typed error
      // error = TaskError, a VError instance
      console.error(VError.fullStack(error));
      // The error's cause
      if (error instanceof VError) {
        const cause = VError.cause(error); // Use VError.cause(error)
        console.error(cause);
      } else {
        console.error(error);
      }
    });
}
