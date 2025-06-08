'use strict';

import VError from 'verror';
import flow from '../lib';
import type { Flow } from '../lib'; // Import Flow type
import { tapLog, getDelayFactor, prettyPrint } from './utils'; // Named import

interface Options {
  resultsAsArray: boolean;
  abortOnError: boolean;
  concurrency: number;
  name?: string; // name is added by getOptions
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

const getOptions = (opts: Options, name: string): Options => Object.assign({}, opts, { name });

const delayed = (number: number) => (ctx: DelayContext, previousResult: any, cb?: CallbackFunction) => {
  const actualCb: CallbackFunction = cb || (previousResult as CallbackFunction);
  const delay = number * ctx.delay;
  setTimeout(() => {
    // if (number === 3 || number === 8) {
    //   return actualCb(new VError('something went wrong with task ' + number)); // Use VError
    // }
    actualCb(null, number);
  }, delay);
};

const oneToFive: Flow = flow.parallel({
  one: delayed(1),
  two: delayed(2),
  three: delayed(3),
  four: delayed(4),
  five: delayed(5)
}, getOptions(options, 'oneToFive'));

const sixToTen: Flow = flow.parallel({
  six: delayed(6),
  seven: delayed(7),
  eight: delayed(8),
  nine: delayed(9),
  ten: delayed(10)
}, getOptions(options, 'sixToTen'));

const elevenToFifteen: Flow = flow.parallel([
  delayed(11),
  delayed(12),
  delayed(13),
  delayed(14),
  delayed(15)
], getOptions(options, 'elevenToFifteen'));

interface AddTotalContext {
  // Define context properties if needed, e.g., from previous flow steps
  [key: string]: any; // Allow other properties
}

interface FlowResult {
  context: AddTotalContext; // Or a more specific context type
  results: { total: number };
}


const addTotal: Flow = flow({
  total(context: AddTotalContext, numbers: (number | undefined)[][]): number {
    // numbers = [[1, 2, 3, 4, 5], [6, 7, 8, 9, 10], [11, 12, 13, 14, 15]]
    const flattenedNumbers: number[] = numbers.reduce((acc: number[], item: (number | undefined)[]) => {
      const definedItems: number[] = item.filter((n): n is number => n !== undefined);
      return acc.concat(definedItems);
    }, []);

    return flattenedNumbers.reduce((sum: number, num: number) => sum + num, 0);
  }
}, { name: 'addTotal' });

const tasks = {
  oneToFive: oneToFive.asTask().pipe(tapLog('oneToFive')),
  sixToTen: sixToTen.asTask().pipe(tapLog('sixToTen')),
  elevenToFifteen: elevenToFifteen.asTask().pipe(tapLog('elevenToFifteen'))
};

interface MainContext {
  some: string;
  delay: number;
}

const mainContextObj: MainContext = { // Renamed and typed
  some: 'data',
  delay: getDelayFactor()
};

flow.parallel(tasks, getOptions(options, 'mainFlow'))
  .pipe(addTotal)
  .run(mainContextObj) // Use renamed and typed context
  .then((data: FlowResult) => { // Typed data
    console.log(data);
    // { context: { some: 'data', delay: 100 },
    //   results: { total: 120 } }
  })
  .catch((error: Error) => { // Typed error
    // error = TaskError, a VError instance
    console.error(VError.fullStack(error));
    // The error cause
    if (error instanceof VError) {
      const cause = VError.cause(error); // Use VError.cause(error)
      console.error(cause);
    } else {
      console.error(error);
    }
  });
