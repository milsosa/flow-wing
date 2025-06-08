'use strict';

import VError from 'verror';
import flow from '../lib';
import type { Flow, TaskInstance } from '../lib'; // Import Flow and TaskInstance types
import { getDelayFactor, prettyPrint } from './utils'; // Named import

const { Task } = flow;

interface Options {
  resultsAsArray: boolean;
  abortOnError: boolean;
  name?: string;
}

interface PipedResults {
  numbers: number[] | number[][];
  add: number[];
  multiply?: number[];
  subtract?: number[];
}

interface DelayContext {
  delayFactor: number;
  results?: PipedResults; // For ctx.results assignment, typed PipedResults
  [key: string]: any; // Allow other properties like 'some'
}

type CallbackFunction = (err: VError | null, result?: number) => void; // Use VError

const options: Options = {
  resultsAsArray: true,
  abortOnError: true
};

const mainContext: DelayContext = { // Typed context
  some: 'data',
  delayFactor: getDelayFactor()
};

const flatten = (values: (number[] | number)[][]): number[] => // Typed flatten function
  values.reduce((acc: number[], value: (number[] | number)[]) => acc.concat(
    value.reduce((innerAcc: number[], innerVal: number[] | number) => // Handle nested arrays
      innerAcc.concat(Array.isArray(innerVal) ? innerVal : [innerVal]), [])
  ), []);


const getOptions = (opts: Options, name: string): Options => Object.assign({}, opts, { name });

const delayed = (num: number) => (ctx: DelayContext, cb: CallbackFunction) => {
  const delay = num * ctx.delayFactor;
  setTimeout(() => cb(null, num), delay);
};

const numbersFlow: Flow = flow.parallel({ // Typed numbersFlow
  one: delayed(1),
  two: delayed(2),
  three: delayed(3),
  four: delayed(4),
  five: delayed(5)
}, getOptions(options, 'numbers'));

interface FlowData {
  results: number[] | number[][]; // More specific type for results
  context: DelayContext;
}


const addFlow: Flow = flow([ // Typed addFlow
  Task.create('add', (ctx: DelayContext, numbers: number[][]) => { // Typed numbers
    // Fail task
    // throw new VError('an error happened in the add flow'); // Use VError

    prettyPrint('addFlow input', numbers);
    const tasks = flatten(numbers).map((num: number) => delayed(num + 5));
    return flow.parallel(tasks, options)
      .run(ctx)
      .then((data: FlowData) => { // Typed data
        if (!ctx.results) { // Initialize results if undefined
          ctx.results = { numbers: [], add: [] };
        }
        ctx.results.numbers = numbers;
        ctx.results.add = data.results as number[];
        prettyPrint('addFlow results', data);
        return data.results;
      });
  })
], getOptions(options, 'add'));

const multiplyFlow: Flow = flow([ // Typed multiplyFlow
  Task.create('multiplier', (ctx: DelayContext, numbers: number[][]) => { // Typed numbers
    prettyPrint('multiplyFlow input', numbers);
    const tasks = flatten(numbers).map((num: number) => delayed(num * 5));
    return flow.parallel(tasks, options)
      .run(ctx)
      .then((data: FlowData) => { // Typed data
        if (ctx.results) {
          ctx.results.multiply = data.results as number[];
        }
        prettyPrint('multiplyFlow results', data);
        return data.results;
      });
  }),
  () => [6, 7, 8, 9, 10]
], getOptions(options, 'multiply'));

const subtractFlow: Flow = flow([ // Typed subtractFlow
  Task.create('extract', (ctx: DelayContext, numbers: number[][]) => { // Typed numbers
    // Uncomment to make task fail
    // throw new VError('an error happened in the subtract flow'); // Use VError

    prettyPrint('subtractFlow input', numbers);
    const tasks = flatten(numbers).map((num: number) => delayed(num - 1));
    return flow.parallel(tasks, options)
      .run(ctx)
      .then((data: FlowData) => { // Typed data
        if (ctx.results) {
          ctx.results.subtract = data.results as number[];
        }
        prettyPrint('subtractFlow results', data);
        return data.results;
      });
  })
], getOptions(options, 'subtract'));


interface PipedFlowResult {
  context: DelayContext;
  results: PipedResults; // Use the PipedResults type
}

// Piped flows
numbersFlow
  .pipe(addFlow)
  .pipe(multiplyFlow)
  .pipe(subtractFlow)
  .run(mainContext) // Use typed context
  .then((data: PipedFlowResult) => { // Typed data
    prettyPrint('piped flows final result', data);
  })
  .catch((error: Error) => { // Typed error
    // error = TaskError, a VError instance
    console.error(VError.fullStack(error));
    // The error's cause
    if (error instanceof VError) {
      const cause = VError.cause(error); // Use VError.cause(error)
      console.error(cause);
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
