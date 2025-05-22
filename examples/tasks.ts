'use strict';

import VError from 'verror';
import flow from '../lib';

const { Task } = flow;

interface MultiplierContext {
  multiplier: number;
  delay?: number; // Optional for multiplyTwo and multiplyThree if delay is passed directly
}

type CallbackSig = (err: Error | null, result?: number) => void;
type TaskType = any; // Placeholder for the type of tasks created by Task.create
type FlowWithOptions = any; // Placeholder for the type of flow instances

const multiplyOne = (ctx: MultiplierContext, number: number, callback: CallbackSig): void => {
  setTimeout(() => callback(null, number * ctx.multiplier), ctx.delay);
};

const multiplyTwo = (ctx: MultiplierContext, number: number, multiplier: number, delay: number): Promise<number> => {
  // Uncomment to make task fail
  // return Promise.reject(new Error(`some weird error multiplying ${number}`));
  return new Promise(resolve => setTimeout(resolve, delay, number * multiplier));
};

const multiplyThree = (ctx: MultiplierContext, number: number): Promise<number> => {
  return Promise.resolve(number * ctx.multiplier);
};

const tasksOneToFive: TaskType[] = [1, 2, 3, 4, 5].map((number: number) => {
  return Task.create(`task${number}`, multiplyOne, number);
});

const tasksSixToTen: TaskType[] = [6, 7, 8, 9, 10].map((number: number) => {
  return Task.create(`task${number}`, multiplyTwo, number, 2, 1000)
    .pipe((ctx: any, result: any) => {
      console.log('executing post-multiplier function over:', result);
      return result;
    });
});

const tasksElevenToFifteen: TaskType[] = [11, 12, 13, 14, 15].map((number: number) => {
  return (ctx: MultiplierContext) => multiplyThree(ctx, number);
});

const tasks: TaskType[] = tasksOneToFive.concat(tasksSixToTen).concat(tasksElevenToFifteen);

const numbersSeriesFlow: FlowWithOptions = flow(tasks, { name: 'multiplier' });
const numbersParallelFlow: FlowWithOptions = flow.parallel(tasks, { name: 'multiplier', concurrency: 5 });

console.time('serial run time');
numbersSeriesFlow.run({ multiplier: 2, delay: 500 })
  .then((results: any) => {
    console.timeEnd('serial run time');
    console.log('serial results', results);
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

console.time('parallel run time');
numbersParallelFlow.run({ multiplier: 2, delay: 2000 })
  .then((results: any) => {
    console.timeEnd('parallel run time');
    console.log('parallel results', results);
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
