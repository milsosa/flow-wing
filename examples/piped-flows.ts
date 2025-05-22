'use strict';

import VError from 'verror';
import flow from '../lib';
import { getDelayFactor, prettyPrint } from './utils'; // Named import

const { Task } = flow;

interface Options {
  resultsAsArray: boolean;
  abortOnError: boolean;
  name?: string;
}

interface DelayContext {
  delayFactor: number;
  results?: any; // For ctx.results assignment
  [key: string]: any; // Allow other properties like 'some'
}

type CallbackFunction = (err: Error | null, result?: number) => void;
type TaskFlow = any; // For flow instances

const options: Options = {
  resultsAsArray: true,
  abortOnError: true
};

const context: DelayContext = {
  some: 'data',
  delayFactor: getDelayFactor()
};

const flatten = (values: any[][]): any[] => values.reduce((acc: any[], value: any[]) => acc.concat(value), []);

const getOptions = (opts: Options, name: string): Options => Object.assign({}, opts, { name });

const delayed = (num: number) => (ctx: DelayContext, cb: CallbackFunction) => {
  const delay = num * ctx.delayFactor;
  setTimeout(() => cb(null, num), delay);
};

const numbersFlow: TaskFlow = flow.parallel({
  one: delayed(1),
  two: delayed(2),
  three: delayed(3),
  four: delayed(4),
  five: delayed(5)
}, getOptions(options, 'numbers'));

const addFlow: TaskFlow = flow([
  Task.create('add', (ctx: DelayContext, numbers: any) => { // numbers can be complex, using any for now
    // Fail task
    // throw new Error('an error happened in the add flow');

    prettyPrint('addFlow input', numbers);
    const tasks = flatten(numbers as any[][]).map((num: number) => delayed(num + 5));
    return flow.parallel(tasks, options)
      .run(ctx)
      .then((data: { results: any }) => {
        ctx.results = { numbers, add: data.results };
        prettyPrint('addFlow results', data);
        return data.results;
      });
  })
], getOptions(options, 'add'));

const multiplyFlow: TaskFlow = flow([
  Task.create('multiplier', (ctx: DelayContext, numbers: any) => {
    prettyPrint('multiplyFlow input', numbers);
    const tasks = flatten(numbers as any[][]).map((num: number) => delayed(num * 5));
    return flow.parallel(tasks, options)
      .run(ctx)
      .then((data: { results: any }) => {
        ctx.results.multiply = data.results;
        prettyPrint('multiplyFlow results', data);
        return data.results;
      });
  }),
  () => [6, 7, 8, 9, 10]
], getOptions(options, 'multiply'));

const subtractFlow: TaskFlow = flow([
  Task.create('extract', (ctx: DelayContext, numbers: any) => {
    // Uncomment to make task fail
    // throw new Error('an error happened in the subtract flow');

    prettyPrint('subtractFlow input', numbers);
    const tasks = flatten(numbers as any[][]).map((num: number) => delayed(num - 1));
    return flow.parallel(tasks, options)
      .run(ctx)
      .then((data: { results: any }) => {
        ctx.results.subtract = data.results;
        prettyPrint('subtractFlow results', data);
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
  .then((data: any) => {
    prettyPrint('piped flows final result', data);
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
