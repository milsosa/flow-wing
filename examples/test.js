'use strict';

const Promise = require('bluebird');
const flow = require('./index');
const Task = flow.Task;

const mulOne = (num, ctx, callback) => {
  setTimeout(() => callback(null, num * ctx.multiplier, ctx.delay));
};

const mulTwo = (num, multiplier, delay) => {
  // return Promise.reject(new Error(`some weird error multiplying ${num}`));
  return Promise.delay(delay, num * multiplier);
};

const mulThree = (num, ctx) => {
  return Promise.resolve(num * ctx.multiplier);
};

const tasksOneToFive = [1, 2, 3, 4, 5].map((num) => {
  return Task.create(`task${num}`, mulOne, num);
});

const tasksSixToTen = [6, 7, 8, 9, 10].map((num) => {
  return Task.create(`task${num}`, mulTwo, num, 2, 2000)
    //.pipe((result) => Promise.resolve(result * 2))
    .pipe((result) => {
      console.log('executing post-multiplier function over: ', result);
      return result;
    });
});

const tasksElevenToFifteen = [11, 12, 13, 14, 15].map((num) => {
  return (ctx) => mulThree(num, ctx);
});

const tasks = tasksOneToFive.concat(tasksSixToTen).concat(tasksElevenToFifteen);

const numbersSerialFlow = flow(tasks, { resultsAsArray: false, abortOnError: false, returnErrors: false });
const numbersParallelFlow = flow.parallel(tasks, { resultsAsArray: false, abortOnError: false, returnErrors: false, concurrency: 5 });

console.time('serial run time');
numbersSerialFlow.run({ multiplier: 2, delay: 2000 })
  .then((results) => {
    console.log('serial results', results);
    console.timeEnd('serial run time');
  })
  .catch(console.error);

console.time('parallel run time');
numbersParallelFlow.run({ multiplier: 2, delay: 3000 })
  .then((results) => {
    console.log('parallel results', results);
    console.timeEnd('parallel run time');
  })
  .catch(console.error);
