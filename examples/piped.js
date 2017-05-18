'use strict';

const VError = require('verror');
const Promise = require('bluebird');
const flow = require('../index');
const Task = flow.Task;

const options = {
  resultsAsArray: true,
  abortOnError: true,
};

const getOptions = (opts, name) => Object.assign({}, opts, { name });

const delayed = (num) => (ctx, cb) => {
  const delay = num * ctx.delayFactor;
  setTimeout(() => cb(null, num), delay)
};

const log = (ctx, result) => {
  console.log('result: %j, with ctx: %j, was piped', result, ctx);
  return result;
};

const numbersFlow = flow.parallel({
  one: delayed(1),
  two: delayed(2),
  three: delayed(3),
  four: delayed(4),
  five: delayed(5),
}, getOptions(options, 'numbers'));

const addFlow = flow([
  Task.create('sum', (ctx, numbers) => {
    // throw new Error('an error happended in the sum flow');

    console.log('addFlow input', numbers);
    const tasks = numbers.map(num => delayed(num + 5));
    return flow.parallel(tasks, options)
      .run(ctx)
      .then((data) => {
        ctx.results = { numbers, add: data.results };
        console.log('addFlow results', data);
        return data.results;
      });
  })
], getOptions(options, 'sum'));

const multiplyFlow = flow([
  Task.create('multiplier', (ctx, numbers) => {
    console.log('multiplyFlow input', numbers);
    const tasks = numbers.map(num => delayed(num * 5));
    return flow.parallel(tasks, options)
      .run(ctx)
      .then((data) => {
        ctx.results.multiply = data.results;
        console.log('multiplyFlow results', data);
        return data.results;
      });
  }),
  // (ctx, p) => [6,7,8,9,10],
], getOptions(options, 'multiply'));

const subtractFlow = flow([
  Task.create('extract', (ctx, numbers) => {
    // throw new Error('an error happended in the subtract flow');

    console.log('subtractFlow input', numbers);
    const tasks = numbers.map(num => delayed(num - 1));
    return flow.parallel(tasks, options)
      .run(ctx)
      .then((data) => {
        ctx.results.subtract = data.results;
        console.log('subtractFlow results', data);
        return data.results;
      });
  })
], getOptions(options, 'subtract'));

const context = {
  some: 'data',
  delayFactor: parseInt(process.argv[2]) || 100,
};

// numbersFlow.pipe(multiplyFlow)
//   .pipe(addFlow)
//   .pipe(subtractFlow)
//   .run(context)
//   .then((data) => {
//     console.log('piped final result', data);
//   });

// const tasks = [
//   numbersFlow.asTask(),
//   multiplyFlow.asTask(),
//   addFlow.asTask(),
//   subtractFlow.asTask(),
// ];
//
// flow(tasks).run(context)
//   .then((data) => {
//     console.log('as tasks final result', data);
//   })
//   .catch(err => console.log(VError.fullStack(err)));

// flow.compose(numbersFlow, addFlow, multiplyFlow, subtractFlow)
//   .run(context)
//   .then((data) => {
//     console.log('composed final result', data.results);
//   })
//   .catch(err => console.log(VError.fullStack(err)));


flow([
    numbersFlow.asTask()
      .pipe((ctx, numbers) => {
        return numbers.map(num => num + 5);
      })
      .pipe((ctx, numbers) => {
        return numbers.map(num => num * 5);
      })
      .pipe((ctx, numbers) => {
        return numbers.map(num => num - 1);
      })
  ], getOptions(options, 'simple flow'))
  .run(context)
  .then((data) => {
    console.log('simple final result', data.results);
  })
  .catch(err => console.log(VError.fullStack(err)));
