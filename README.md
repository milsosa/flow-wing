# Flow-wing [![Build Status](https://github.com/milsosa/flow-wing/actions/workflows/ci.yml/badge.svg)](https://github.com/milsosa/flow-wing/actions/workflows/ci.yml)

> A simple library to easily build complex flows through composed/piped tasks flows

Flow-wing is a flow-control library with support for composable, pipeable tasks flows with shared runtime context.

It is built around two components: `Flow` and `Task`.

A `Flow` is the representation of a list/object of one or more `Task` or `Flow` instances that will be executed
in `series`, `waterfall` or `parallel`.

A `Task` could be a normal function, a task created with `Task.create([id], handler, [...args])` or even another
`Flow` instance converted to `Task`.

A task can be synchronous or asynchronous using callbacks or promises.

## Install

```bash
$ npm install flow-wing
```

## Usage

```typescript
import VError from 'verror';
import flow from 'flow-wing';

// A simple async task that resolves after a delay
const delayed = (number: number) => (ctx: { delay: number }) =>
  new Promise(resolve => setTimeout(() => resolve(number), number * ctx.delay));

const context = { delay: 100 };

const tasks = {
  one: delayed(1),
  two: delayed(2),
  three: delayed(3),
  four: delayed(4),
  five: delayed(5)
};

// Create a flow that runs the tasks in parallel
const numbersParallelFlow = flow.parallel(tasks, { name: 'numbers' });

console.time('parallel run time');
numbersParallelFlow.run(context)
  .then(data => {
    console.timeEnd('parallel run time');
    console.log(data);
    // parallel run time: 511.154ms
    // {
    //   results: { one: 1, two: 2, three: 3, four: 4, five: 5 },
    //   errors: [],
    //   context: { delay: 100 }
    // }
  })
  .catch(error => {
    // error is a TaskError, a VError instance
    console.error(VError.fullStack(error));
  });

// Create a waterfall flow
const multiplyTasks = [
  numbersParallelFlow.asTask('numbers'),
  (ctx: unknown, numbers: number[]) => numbers.concat([6, 7, 8, 9, 10]),
  (ctx: { delay: number }, numbers: number[]) => {
    const tasks = numbers.map(number => delayed(number * 5));
    return flow.parallel(tasks)
      .run(ctx)
      .then(data => data.results);
  }
];

const multiplyFlow = flow.waterfall(multiplyTasks, { name: 'multiply' });

console.time('multiply run time');
multiplyFlow.run(context)
  .then(data => {
    console.timeEnd('multiply run time');
    console.log(data);
    // multiply run time: 3022.582ms
    // {
    //   results: [ 5, 10, 15, 20, 25, 30, 35, 40, 45, 50 ],
    //   errors: [],
    //   context: { delay: 100 }
    // }
  })
  .catch(error => {
    console.error(VError.fullStack(error));
  });
```

## API

The API is now self-documented thanks to the TypeScript migration. Please refer to the type definitions in the `src` directory for detailed information about the available methods and options.

### Run modes

> All the modes when running with `options.abortOnError = true` will abort its execution
whenever an error occurs in the current task execution and will not run the pending ones.

> All the modes when running with `options.abortOnError = false` will continue its execution
and will add the occurred errors to the `data.errors` array and the corresponding results array index
or object key will be `undefined`.

> All the modes when a flow contains a single task it will un-wrap such task result and that
will be the resulting value of `data.results` unlike for multiple tasks flows that it will be
an array or object depending on the provided tasks type.

#### series

It executes its tasks in series, so the next task will start running only until the previous one has finished.

#### waterfall

It behaves like `series` with the difference that it passes the previous task result as
argument to the next one and the final `data.results` will be the last task's returned value.

#### parallel

It executes its tasks concurrently based on the `options.concurrency` option.

> For complex/large flows it is your responsibility to control how many tasks are being
run concurrently so that your application/system don't get blocked/unresponsive.
It's best suited for I/O-bound tasks and not for CPU-bound/synchronous ones.

## Development

- **Lint:** `npm run lint`
- **Build:** `npm run build`
- **Test:** `npm test`
