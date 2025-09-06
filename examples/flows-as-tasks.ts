import VError from 'verror';
import flow from '../src';
import * as Utils from './utils';
import { FlowOptions } from '../src/types';

const options: FlowOptions = {
  resultsAsArray: true,
  abortOnError: false,
  concurrency: 5
};

const getOptions = (opts: FlowOptions, name: string): FlowOptions => ({ ...opts, name });

const delayed = (number: number) => (ctx: { delay: number }, previousResult: any, cb?: (err: Error | null, res?: number) => void) => {
  const callback = cb || previousResult;
  const delay = number * ctx.delay;
  setTimeout(() => {
    // if (number === 3 || number === 8) {
    //   return cb(new Error('something went wrong with task ' + number));
    // }

    callback(null, number);
  }, delay);
};

const oneToFive = (flow as any).parallel({
  one: delayed(1),
  two: delayed(2),
  three: delayed(3),
  four: delayed(4),
  five: delayed(5)
}, getOptions(options, 'oneToFive'));

const sixToTen = (flow as any).parallel({
  six: delayed(6),
  seven: delayed(7),
  eight: delayed(8),
  nine: delayed(9),
  ten: delayed(10)
}, getOptions(options, 'sixToTen'));

const elevenToFifteen = (flow as any).parallel([
  delayed(11),
  delayed(12),
  delayed(13),
  delayed(14),
  delayed(15)
], getOptions(options, 'elevenToFifteen'));

const addTotal = flow({
  total(context: any, numbers: number[][]) {
    // numbers = [[1, 2, 3, 4, 5], [6, 7, 8, 9, 10], [11, 12, 13, 14, 15]]
    return numbers.reduce((acc, item) => acc.concat(item), [])
      .filter(number => number !== undefined)
      .reduce((sum, number) => sum + number, 0);
  }
}, { name: 'addTotal' });

const tasks = {
  oneToFive: oneToFive.asTask('oneToFive').pipe(Utils.tapLog('oneToFive')),
  sixToTen: sixToTen.asTask('sixToTen').pipe(Utils.tapLog('sixToTen')),
  elevenToFifteen: elevenToFifteen.asTask('elevenToFifteen').pipe(Utils.tapLog('elevenToFifteen'))
};

const context = {
  some: 'data',
  delay: Utils.getDelayFactor()
};

(flow as any).parallel(tasks, getOptions(options, 'mainFlow'))
  .pipe(addTotal)
  .run(context)
  .then((data: any) => {
    console.log(data);
    // { context: { some: 'data', delay: 100 },
    //   results: { total: 120 } }
  })
  .catch((error: any) => {
    // error = TaskError, a VError instance
    console.error(VError.fullStack(error));
    // The error cause
    console.error((error as VError).cause());
  });
