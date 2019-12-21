'use strict';

const VError = require('verror');
const flow = require('../lib');

const { Task } = flow;

const multiplyOne = (ctx, number, callback) => {
  setTimeout(() => callback(null, number * ctx.multiplier), ctx.delay);
};

const multiplyTwo = (ctx, number, multiplier, delay) => {
  // Uncomment to make task fail
  // return Promise.reject(new Error(`some weird error multiplying ${number}`));
  return new Promise(resolve => setTimeout(resolve, delay, number * multiplier));
};

const multiplyThree = (ctx, number) => {
  return Promise.resolve(number * ctx.multiplier);
};

const tasksOneToFive = [1, 2, 3, 4, 5].map(number => {
  return Task.create(`task${number}`, multiplyOne, number);
});

const tasksSixToTen = [6, 7, 8, 9, 10].map(number => {
  return Task.create(`task${number}`, multiplyTwo, number, 2, 1000)
    .pipe((ctx, result) => {
      console.log('executing post-multiplier function over: ', result);
      return result;
    });
});

const tasksElevenToFifteen = [11, 12, 13, 14, 15].map(number => {
  return ctx => multiplyThree(ctx, number);
});

const tasks = tasksOneToFive.concat(tasksSixToTen).concat(tasksElevenToFifteen);

const numbersSeriesFlow = flow(tasks, { name: 'multiplier' });
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
    console.error(error.cause());
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
    console.error(error.cause());
  });
