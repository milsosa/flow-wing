'use strict';

const VError = require('verror');
const flow = require('../index');
const Utils = require('./utils');

const Task = flow.Task;

const options = {
  resultsAsArray: true,
  abortOnError: true
};

const context = {
  some: 'data',
  delayFactor: Utils.getDelayFactor()
};

const flatten = values => values.reduce((acc, value) => acc.concat(value), []);

const getOptions = (opts, name) => Object.assign({}, opts, { name });

const delayed = num => (ctx, cb) => {
  const delay = num * ctx.delayFactor;
  setTimeout(() => cb(null, num), delay);
};

const numbersFlow = flow.parallel({
  one: delayed(1),
  two: delayed(2),
  three: delayed(3),
  four: delayed(4),
  five: delayed(5)
}, getOptions(options, 'numbers'));

const addFlow = flow([
  Task.create('add', (ctx, numbers) => {
    // Fail task
    // throw new Error('an error happended in the add flow');

    Utils.prettyPrint('addFlow input', numbers);
    const tasks = flatten(numbers).map(num => delayed(num + 5));
    return flow.parallel(tasks, options)
      .run(ctx)
      .then(data => {
        ctx.results = { numbers, add: data.results };
        Utils.prettyPrint('addFlow results', data);
        return data.results;
      });
  })
], getOptions(options, 'add'));

const multiplyFlow = flow([
  Task.create('multiplier', (ctx, numbers) => {
    Utils.prettyPrint('multiplyFlow input', numbers);
    const tasks = flatten(numbers).map(num => delayed(num * 5));
    return flow.parallel(tasks, options)
      .run(ctx)
      .then(data => {
        ctx.results.multiply = data.results;
        Utils.prettyPrint('multiplyFlow results', data);
        return data.results;
      });
  }),
  () => [6, 7, 8, 9, 10]
], getOptions(options, 'multiply'));

const subtractFlow = flow([
  Task.create('extract', (ctx, numbers) => {
    // Uncomment to make task fail
    // throw new Error('an error happended in the subtract flow');

    Utils.prettyPrint('subtractFlow input', numbers);
    const tasks = flatten(numbers).map(num => delayed(num - 1));
    return flow.parallel(tasks, options)
      .run(ctx)
      .then(data => {
        ctx.results.subtract = data.results;
        Utils.prettyPrint('subtractFlow results', data);
        return data.results;
      });
  })
], getOptions(options, 'subtract'));

// Piped flows
numbersFlow
  .pipe(addFlow)
  .pipe(multiplyFlow)
  .pipe(subtractFlow)
  .run(context)
  .then(data => {
    Utils.prettyPrint('piped flows final result', data);
  })
  .catch(err => {
    // err = TaskError, a VError instance
    console.error(VError.fullStack(err));
    // The error cause
    console.error(err.cause());
  });

// Flows as task
// const tasks = [
//   numbersFlow.asTask(),
//   addFlow.asTask(),
//   multiplyFlow.asTask(),
//   subtractFlow.asTask()
// ];
//
// flow.waterfall(tasks, getOptions(options, 'flows-as-tasks'))
//   .run(context)
//   .then(data => {
//     Utils.prettyPrint('flows-as-tasks final result', data);
//   })
//   .catch(err => {
//     // err = TaskError, a VError instance
//     console.error(VError.fullStack(err));
//     // The error cause
//     console.error(err.cause());
//   });

// Simple task flow
// flow.waterfall([
//   numbersFlow.asTask()
//       .pipe((ctx, numbers) => {
//         return numbers.map(num => num + 5);
//       })
//       .pipe((ctx, numbers) => {
//         return numbers.map(num => num * 5);
//       })
//       .pipe((ctx, numbers) => {
//         return numbers.map(num => num - 1);
//       })
// ], getOptions(options, 'simple-task-flow'))
//   .run(context)
//   .then(data => {
//     Utils.prettyPrint('simple-task-flow final result', data);
//   })
//   .catch(err => {
//     // err = TaskError, a VError instance
//     console.error(VError.fullStack(err));
//     // The error cause
//     console.error(err.cause());
//   });
