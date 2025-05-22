'use strict';

import VError from 'verror';
import flow from '../lib';
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

type CallbackFunction = (err: Error | null, result?: number) => void;

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
    //   return actualCb(new Error('something went wrong with task ' + number));
    // }
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

const sixToTen: any = flow.parallel({
  six: delayed(6),
  seven: delayed(7),
  eight: delayed(8),
  nine: delayed(9),
  ten: delayed(10)
}, getOptions(options, 'sixToTen'));

const elevenToFifteen: any = flow.parallel([
  delayed(11),
  delayed(12),
  delayed(13),
  delayed(14),
  delayed(15)
], getOptions(options, 'elevenToFifteen'));

const addTotal: any = flow({
  total(context: any, numbers: (number | undefined)[][]): number {
    // numbers = [[1, 2, 3, 4, 5], [6, 7, 8, 9, 10], [11, 12, 13, 14, 15]]
    const flattenedNumbers: number[] = numbers.reduce((acc: number[], item: (number|undefined)[]) => {
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

const contextObj = { // Renamed to avoid conflict with potential imported 'context' type
  some: 'data',
  delay: getDelayFactor()
};

flow.parallel(tasks, getOptions(options, 'mainFlow'))
  .pipe(addTotal)
  .run(contextObj) // Use renamed context
  .then((data: any) => {
    console.log(data);
    // { context: { some: 'data', delay: 100 },
    //   results: { total: 120 } }
  })
  .catch((error: any) => { // VError type could be more specific if VError is always expected
    // error = TaskError, a VError instance
    console.error(VError.fullStack(error));
    // The error cause
    if (error instanceof VError) {
      console.error(error.cause());
    } else {
      console.error(error);
    }
  });
