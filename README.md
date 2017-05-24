# Flow-wing

> A Simple, Composable, Pipeable Tasks Flows library

Flow-wing is a flow control library with support for composable, pipeable tasks flows with shared context.

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
  cb = cb ? cb : previousResult;
  setTimeout(() => cb(null, number), number * ctx.delay);
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
const numbersParallelFlow = flow.parallel(tasks, { name: 'numbers' });
const numbersWaterfallFlow = flow.waterfall(tasks, { name: 'numbers' });

console.time('series run time');
numbersSeriesFlow.run(context)
  .then(data => {
    console.timeEnd('series run time');
    console.log(data);
    // series run time: 1513ms
    // { context: { delay: 100 }, results: [ 1, 2, 3, 4, 5 ] }
  })
  .catch(err => {
    // err is a TaskError, a VError instance
    console.error(VError.fullStack(err));
    // The error cause
    console.error(err.cause());
  });

console.time('waterfall run time');
numbersWaterfallFlow.run(context)
  .then(data => {
    console.timeEnd('waterfall run time');
    console.log(data);
    // waterfall run time: 1513ms
    // { context: { delay: 100 },
    //   results: { one: 1, two: 2, three: 3, four: 4, five: 5 } }
  })
  .catch(err => {
    // err is a TaskError, a VError instance
    console.error(VError.fullStack(err));
    // The error cause
    console.error(err.cause());
  });

console.time('parallel run time');
numbersParallelFlow.run(context)
  .then(data => {
    console.timeEnd('parallel run time');
    console.log(data);
    // parallel run time: 506ms
    // { context: { delay: 100 },
    //   results: { one: 1, two: 2, three: 3, four: 4, five: 5 } }
  })
  .catch(err => {
    // err is a TaskError, a VError instance
    console.error(VError.fullStack(err));
    // The error cause
    console.error(err.cause());
  });
```
## Examples

Take a look at the examples [here](examples).

## API

### flow(tasks, [Options]) -> Flow

> An alias for `flow.series(tasks, [Options])`

The main exposed function to create flows

* `tasks` _Array&lt;Function|Task&gt; | Object{ string: Function|Task, ... }_ - The array or object of normal functions or `Task` instances to run
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
  resultsAsArray: true, // To return the values as array when the tasks were an object
  abortOnError: true, // Whether abort Flow's execution on error or not
  concurrency: Infinity, // Parallel execution concurrency, Infinity = no limit
  name: 'unnamed', // Flow's name, used only for debuggability
};
```

### Context

It could be any value and will be defaulted to an empty object `{}` when no value was provided.

- The provided value will not be cloned, so for objects and arrays the mutations will be reflected on the original value/object
- When not provided, every time a Flow runs it will have its own clean context `{}`

### Data

The object resolved by the promise returned by `someFlow.run(context)`

```js
const data = {
  context: Context,
  results: Array<any> | Object{ string: any, ... },
  errors: Array<TaskError> // Returned only when Options.abortOnError = false
};
```

### TaskError

Whenever an error happens while running a Flow/Task, it will be wrapped into a
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

> 'task "task-id" in flow{flow-name}:series has failed: the main error message goes here'

**Note:**

When `options.abortOnError = false` an `errors` array property will be available in the
resulting `data` object containing all the occurred errors (if any).

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

##### run(Context, [value]) -> Promise&lt;Any&gt;

The method to run the task's handler(s).

> This method is meant to be only called by the running flow the task belongs to.

##### pipe(handler, [...args]) -> Task

This method adds additional handlers/functions to be executed when the task runs.

The previous handler result will be piped to the next piped handler
and the last one's result will be the final task result.

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
