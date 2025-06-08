'use strict';

import VError from 'verror';
import flow from '../lib';
import type { Flow, Task as TaskInstanceType, TaskFunction } from '../lib'; // Import Flow and Task types

const { Task } = flow;

interface MultiplierContext {
  multiplier: number;
  delay?: number; // Optional for multiplyTwo and multiplyThree if delay is passed directly
  [key: string]: any; // Allow other properties if needed by flow context
}

type CallbackSig = (err: VError | null, result?: number) => void; // Use VError

const multiplyOne = (ctx: MultiplierContext, number: number, callback: CallbackSig): void => {
  if (typeof ctx.delay !== 'number') {
    callback(new VError('Delay is not defined in context for multiplyOne'));
    return;
  }
  setTimeout(() => callback(null, number * ctx.multiplier), ctx.delay);
};

const multiplyTwo = (ctx: MultiplierContext, number: number, multiplier: number, delay: number): Promise<number> => {
  // Uncomment to make task fail
  // return Promise.reject(new VError(`some weird error multiplying ${number}`)); // Use VError
  return new Promise(resolve => setTimeout(resolve, delay, number * multiplier));
};

const multiplyThree = (ctx: MultiplierContext, number: number): Promise<number> => {
  return Promise.resolve(number * ctx.multiplier);
};

const tasksOneToFive: TaskInstanceType[] = [1, 2, 3, 4, 5].map((number: number) => { // Typed tasks array
  return Task.create(`task${number}`, multiplyOne, number);
});

const tasksSixToTen: TaskInstanceType[] = [6, 7, 8, 9, 10].map((number: number) => { // Typed tasks array
  return Task.create(`task${number}`, multiplyTwo, number, 2, 1000)
    .pipe((ctx: MultiplierContext, result: number) => { // Typed ctx and result
      console.log('executing post-multiplier function over:', result);
      return result;
    });
});

const tasksElevenToFifteen: TaskFunction[] = [11, 12, 13, 14, 15].map((number: number) => { // Typed tasks array
  return (ctx: MultiplierContext) => multiplyThree(ctx, number);
});

const allTasks: (TaskInstanceType | TaskFunction)[] = (tasksOneToFive as (TaskInstanceType | TaskFunction)[])
  .concat(tasksSixToTen as (TaskInstanceType | TaskFunction)[])
  .concat(tasksElevenToFifteen);


const numbersSeriesFlow: Flow = flow(allTasks, { name: 'multiplier' }); // Typed flow instance
const numbersParallelFlow: Flow = flow.parallel(allTasks, { name: 'multiplier', concurrency: 5 }); // Typed flow instance

interface FlowResults {
  context: MultiplierContext;
  results: (number | undefined)[]; // Results can be numbers or undefined if a task fails without abortOnError
}

console.time('serial run time');
numbersSeriesFlow.run({ multiplier: 2, delay: 500 })
  .then((results: FlowResults) => { // Typed results
    console.timeEnd('serial run time');
    console.log('serial results', results);
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

console.time('parallel run time');
numbersParallelFlow.run({ multiplier: 2, delay: 2000 })
  .then((results: FlowResults) => { // Typed results
    console.timeEnd('parallel run time');
    console.log('parallel results', results);
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
