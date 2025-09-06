import VError from 'verror';
import flow from '../src';
import * as Utils from './utils';
import { FlowOptions } from '../src/types';

const options: FlowOptions = {
  resultsAsArray: true,
  abortOnError: false,
  concurrency: 5
};

const context = {
  some: 'data',
  delay: Utils.getDelayFactor()
};

const getOptions = (opts: FlowOptions, name: string): FlowOptions => ({ ...opts, name });

const delayed = (number: number) => (ctx: { delay: number }, previousResult: any, cb?: (err: Error | null, res?: number) => void) => {
  const callback = cb || previousResult;
  const delay = number * ctx.delay;
  setTimeout(() => {
    if (number === 3) {
      return callback(new Error('something went wrong with task ' + number));
    }

    callback(null, number);
  }, delay);
};

const oneToFive = flow.parallel({
  one: delayed(1),
  two: delayed(2),
  three: delayed(3),
  four: delayed(4),
  five: delayed(5)
}, getOptions(options, 'oneToFive'));

const tasks = [
  oneToFive.asTask('oneToFive1').pipe(Utils.tapLog('oneToFive1')),
  oneToFive.asTask('oneToFive2').pipe(Utils.tapLog('oneToFive2')),
  oneToFive.asTask('oneToFive3').pipe(Utils.tapLog('oneToFive3')),
  oneToFive.asTask('oneToFive4').pipe(Utils.tapLog('oneToFive4')),
  oneToFive.asTask('oneToFive5').pipe(Utils.tapLog('oneToFive5'))
];

const testFlow = flow.parallel(tasks, getOptions(options, 'mainFlow'));

for (let i = 1; i <= 5; i++) {
  testFlow.run(context)
    .then((data: any) => {
      console.log('execution %d finished with %d errors', i, data.errors.length);
      console.log('execution %d results:', i, data.results);
    })
    .catch((error: any) => {
      // error = TaskError, a VError instance
      console.error(VError.fullStack(error));
      // The error's cause
      console.error((error as VError).cause());
    });
}
