/* eslint-disable @typescript-eslint/no-explicit-any */
import VError from 'verror';
import flow from '../src';

const { Task } = flow;

const multiplyOne = (ctx: { multiplier: number, delay: number }, number: number, callback: (err: null, res: number) => void) => {
  setTimeout(() => callback(null, number * ctx.multiplier), ctx.delay);
};

const multiplyTwo = (ctx: any, number: number, multiplier: number, delay: number) => {
  // Uncomment to make task fail
  // return Promise.reject(new Error(`some weird error multiplying ${number}`));
  return new Promise(resolve => setTimeout(resolve, delay, number * multiplier));
};

const multiplyThree = (ctx: { multiplier: number }, number: number) => {
  return Promise.resolve(number * ctx.multiplier);
};

const tasksOneToFive = [1, 2, 3, 4, 5].map(number => {
  return Task.create(`task${number}`, multiplyOne, number);
});

const tasksSixToTen = [6, 7, 8, 9, 10].map(number => {
  return Task.create(`task${number}`, multiplyTwo, number, 2, 1000)
    .pipe((ctx: any, result: any) => {
      console.log('executing post-multiplier function over:', result);
      return result;
    });
});

const tasksElevenToFifteen = [11, 12, 13, 14, 15].map(number => {
  return (ctx: { multiplier: number }) => multiplyThree(ctx, number);
});

const tasks = [...tasksOneToFive, ...tasksSixToTen, ...tasksElevenToFifteen];

const numbersSeriesFlow = flow.series(tasks, { name: 'multiplier' });
const numbersParallelFlow = flow.parallel(tasks, { name: 'multiplier', concurrency: 5 });

console.time('serial run time');
numbersSeriesFlow.run({ multiplier: 2, delay: 500 })
  .then(results => {
    console.timeEnd('serial run time');
    console.log('serial results', results);
  })
  .catch(error => {
    // error = TaskError, a VError instance
    console.error(VError.fullStack(error));
    // The error's cause
    console.error((error as VError).cause());
  });

console.time('parallel run time');
numbersParallelFlow.run({ multiplier: 2, delay: 2000 })
  .then(results => {
    console.timeEnd('parallel run time');
    console.log('parallel results', results);
  })
  .catch(error => {
    // error = TaskError, a VError instance
    console.error(VError.fullStack(error));
    // The error's cause
    console.error((error as VError).cause());
  });
