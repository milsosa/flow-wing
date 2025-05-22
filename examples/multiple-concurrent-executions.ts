'use strict';

import VError from 'verror';
import flow from '../lib';
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

type CallbackFunction = (err: Error | null, result?: number) => void;

const options: Options = {
  resultsAsArray: true,
  abortOnError: false,
  concurrency: 5
};

const context: { some: string; delay: number } = {
  some: 'data',
  delay: getDelayFactor()
};

const getOptions = (opts: Options, name: string): Options => Object.assign({}, opts, { name });

const delayed = (number: number) => (ctx: DelayContext, previousResult: any, cb?: CallbackFunction) => {
  const actualCb: CallbackFunction = cb || (previousResult as CallbackFunction);
  const delay = number * ctx.delay;
  setTimeout(() => {
    if (number === 3) {
      return actualCb(new Error('something went wrong with task ' + number));
    }
    actualCb(null, number);
  }, delay);
};

const oneToFive: any = flow.parallel({
  one: delayed(1),
  two: delayed(2),
  three: delayed(3),
  four: delayed(4),
  five: delayed(5)
}, getOptions(options, 'oneToFive'));

const tasks: any[] = [
  oneToFive.asTask().pipe(tapLog('oneToFive1')),
  oneToFive.asTask().pipe(tapLog('oneToFive2')),
  oneToFive.asTask().pipe(tapLog('oneToFive3')),
  oneToFive.asTask().pipe(tapLog('oneToFive4')),
  oneToFive.asTask().pipe(tapLog('oneToFive5'))
];

const testFlow: any = flow.parallel(tasks, getOptions(options, 'mainFlow'));

for (let i = 1; i <= 5; i++) {
  testFlow.run(context)
    .then((data: { errors: any[], results: any }) => {
      console.log('execution %d finished with %d errors', i, data.errors.length);
      console.log('execution %d results:', i, data.results);
    })
    .catch((error: any) => { // VError type could be more specific
      // error = TaskError, a VError instance
      console.error(VError.fullStack(error));
      // The error's cause
      if (error instanceof VError) {
        console.error(error.cause());
      } else {
        console.error(error);
      }
    });
}
