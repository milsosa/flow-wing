# Flow-wing

> A simple library to easily build complex flows through composed/piped tasks flows

Flow-wing is a flow control library with support for composable, pipeable tasks flows with shared runtime context.

It is built around two components: `Flow` and `Task`.

A `Flow` is the representation of a list/object of one or more `Task` or `Flow` instances that will be executed in `series`, `waterfall` or `parallel`.

A `Task` could be a normal function or a task created through `Task.create([id], handler, [...args])`.

## Install

```bash
$ npm install --save flow-wing
```

## Usage

```js
const VError = require('verror');
const flow = require('flow-wing');

const delayed = number => ctx =>
  new Promise(resolve => setTimeout(() => resolve(number), number * ctx.delay));

const delayedWithCallback = number => (ctx, previousResult, cb) => {
  // When running in waterfall {previousResult} will be the previous task result
  // or when running in a flow that was piped into the running one as well
  const callback = cb || previousResult;
  setTimeout(() => callback(null, number), number * ctx.delay);
};

const context = { delay: 100 };

const tasks = {
  one: delayed(1),
  two: delayed(2),
  three: delayed(3),
  four: delayed(4),
  five: delayed(5)
};

const numbersSeriesFlow = flow(tasks, { name: 'numbers', resultsAsArray: true });
const numbersParallelFlow = flow.parallel(tasks, { name: 'numbers', resultsAsArray: true });
const numbersWaterfallFlow = flow.waterfall(tasks, { name: 'numbers' });

const multiplyTasks = [
  numbersParallelFlow.asTask(),
  (context, numbers) => numbers.concat([6, 7, 8, 9, 10]),
  (context, numbers) => {
    const tasks = numbers.map(number => delayed(number * 5));
    return flow.parallel(tasks)
      .run({ delay: 50 })
      .then(data => data.results);
  }
];

const multiplyFlow = flow.waterfall(multiplyTasks, { name: 'multiply' });

const errorHandler = (err) => {
  // err is a TaskError, a VError instance
  console.error(VError.fullStack(err));
  // Get err's info
  console.error(VError.info(err));
  // The error cause
  console.error(err.cause());
};

console.time('series run time');
numbersSeriesFlow.run(context)
  .then(data => {
    console.timeEnd('series run time');
    console.log(data);
    // series run time: 1526.753ms
    // { results: [ 1, 2, 3, 4, 5 ],
    //   errors: [],
    //   context: { delay: 100 } }
  })
  .catch(errorHandler);

console.time('waterfall run time');
numbersWaterfallFlow.run(context)
  .then(data => {
    console.timeEnd('waterfall run time');
    console.log(data);
    // waterfall run time: 1524.577ms
    // { results: { one: 1, two: 2, three: 3, four: 4, five: 5 },
    //   errors: [],
    //   context: { delay: 100 } }
  })
  .catch(errorHandler);

console.time('parallel run time');
numbersParallelFlow.run(context)
  .then(data => {
    console.timeEnd('parallel run time');
    console.log(data);
    // parallel run time: 511.154ms
    // { results: [ 1, 2, 3, 4, 5 ],
    //   errors: [],
    //   context: { delay: 100 } }
  })
  .catch(errorHandler);

console.time('multiply run time');
multiplyFlow.run(context)
  .then(data => {
    console.timeEnd('multiply run time');
    console.log(data);
    // multiply run time: 3022.582ms
    // { results: [ 5, 10, 15, 20, 25, 30, 35, 40, 45, 50 ],
    //   errors: [],
    //   context: { delay: 100 } }
  })
  .catch(errorHandler);
```

## Examples

Take a look at the examples [here](examples).

## API

### flow(tasks, [Options]) -> Flow

> An alias for `flow.series(tasks, [Options])`

The main exposed function to create flows

* `tasks` _Array&lt;Function|Task|Flow&gt; | Object{ string: Function|Task|Flow, ... }_ - The array or object of normal functions, `Task` or `Flow` instances to run
* `options` _Options_ - The Flow's options

#### Flow factory functions

- `flow.series(tasks, [Options]) -> Flow`
- `flow.waterfall(tasks, [Options]) -> Flow`
- `flow.parallel(tasks, [Options]) -> Flow`

```js
const flow = require('flow-wing');
const Task = flow.Task;

const options = {
  abortOnError: true,
  concurrency: 2
};
const taskTwoArg = 'some argument';
const tasks = [
  (context) => Promise.resolve(1),
  Task.create('taskTwo', (context, customArg) => Promise.resolve(customArg), taskTwoArg),
];

const seriesFlow = flow.series(tasks, options); // same as flow(tasks, options);
const waterfallFlow = flow.waterfall(tasks, options);
const parallelFlow = flow.parallel(tasks, options);
```

### flow.Task

The Task object that exposes the static `.create()` method.

### Options

The allowed options that determine the flow's runtime (error handling, concurrency) and how the results should be returned.

```js
// Defaults
const options = {
  resultsAsArray: true,
  abortOnError: true,
  concurrency: Infinity, // Infinity = no limit
  name: 'unnamed'
};
```

- `resultsAsArray` - To return the values as array when the passed tasks are an object
- `abortOnError` - Whether abort Flow's execution on error or not. When `false` all the occurred errors will be available on the `data.errors` array.
- `concurrency` - Flow's execution concurrency.
- `name` - Flow's name, used only for debuggability

### Context

It could be any value and will be defaulted to an empty object `{}` when no value was provided.

- The provided value will not be cloned, so for objects and arrays the mutations will be reflected on the original value/object
- When not provided, every time a Flow runs it will have its own clean context `{}`

### Data

The object resolved by the promise returned by `someFlow.run(context)`.

There are some details about the resulting `data` object and are as follow:

- `data.results` - Its value will vary depending on the flow running mode

```js
{
  context: Context,
  results: Array<*> | Object{ string: *, ... } | *,
  errors: Array<TaskError>
}
```

### TaskError

Whenever an error happens while running a flow's task, it will be wrapped into a
`TaskError` which is a [VError](https://github.com/joyent/node-verror) instance
and the following additional information will be added to it.

```js
// VError.info(err)
{
  taskID: 'task-id',
  flowName: 'flow-name',
  flowMode: 'series'
}
```

Error message example:

> task "task-id" in flow{flow-name}:series has failed: the main error message goes here

The main/cause error could be obtained through the `err.cause()` method.

```js
err.cause(); // returns the main error which was wrapped
```

### Task

#### Task handler function

The task's handler function should have the following signature.

```js
/**
 * Task's handler signature
 *
 * @param Context context     The flow's runtime shared context
 * @param Any [pipedValue]    The previous piped Flow or Task result value. It will be
 *                            available only for flows running in waterfall or flows|tasks
 *                            that were piped into the running flow.
 * @param Any [...args]       The handler's specific additional arguments
 * @param Function [callback] The handler's callback. When not used, a value or Promise should be returned
 */
function handler(context, pipedValue, ...args, callback) {
  // body
}

// Task public interface
const Task = {
  id: string,
  run(Context, [value]) -> Promise,
  pipe(handler, [...args]) -> Task, // Returns itself
}
```

#### Methods

##### Task.create([id], handler, [...args]) -> Task

Tasks factory function

- `id` _Optional_ - The task's id. When not provided it will be assigned as follow.
  1. The handler/function's name (if any)
  2. The corresponding index in the tasks array
  3. The key in the tasks object
- `handler` _required (Function)_ - The task's handler. It should have the signature defined above.
- `...args` _Optional_ - The task's specific additional arguments.

##### run(Context, [value]) -> Promise&lt;any&gt;

The method to run the task's handler(s).

> This method is meant to be only called by the running flow the task belongs to.

##### pipe(handler, [...args]) -> Task

This method adds additional handlers/functions to be executed when the task runs.

The previous handler result will be piped to the next piped handler
and the last one's result will be the final task result.

> Useful for debugging or transforming the task's returning data

### Flow

Represents a list (Array/Object) of tasks or flows converted to task and optionally additional piped flows
that should be run in some of the run modes: `series | waterfall | parallel`.

```js
// Flow public interface
const Flow = {
  name: string, // used only for debuggability
  type: 'series' | 'waterfall' | 'parallel', // used only for debuggability
  run(Context) -> Promise<Data>,
  asTask([id]) -> Task,
  pipe(Flow) -> Flow, // Returns itself
  unpipe([Flow]) -> Flow, // Returns itself
};
```

#### Methods

##### run(Context) -> Promise&lt;Data&gt;

The main method to run the flow's tasks execution.

```js
someFlow.run(Context) -> Promise<Data>
```

##### asTask([id]) -> Task

Converts the Flow to a Task so that can be run into another Flow.

##### pipe(Flow) -> Flow

> It's like converting a list of flows to task and running them in `waterfall`

Pipes the provided `Flow` into the current one and returns itself.

- Multiple flows can be piped
- Once the main flow runs the piped ones will receive the previous one results
- Once a flow is piped it will remain piped unless it's un-piped

```js
someFlow.pipe(someOtherFlow).run(Context) -> Promise<Data>
```

##### unpipe([Flow]) -> Flow

Un-pipes the provided `Flow` or all ones if not provided from the current one and returns itself.

```js
someFlow.unpipe(someOtherFlow).run(Context) -> Promise<Data>
```

## Run modes

Here is a detail of the difference between the run modes.

> All the modes when running with `options.abortOnError = true` will abort its execution
whenever an error occurs in the current task execution and will not run the pending ones.

> All the modes when running with `options.abortOnError = false` will continue its execution
and will add the occurred errors to the `data.errors` array and the corresponding results array index
or object key will be `undefined`.

### series

It executes its tasks in series, so the next task will start running only until the previous one has finished.

### waterfall

It behaves like `series` with the only difference that it passes the previous task result as
argument to the next one. Take a look at the `pipedValue` argument in the handler signature above.

### parallel

It executes its tasks concurrently based on the `options.concurrency` option.

> For complex/large flows it is your responsibility to control how many tasks are being
run concurrently so that your application/system don't get blocked/unresponsive.
It's best suited for I/O-bound tasks and not for CPU-bound/synchronous ones.
