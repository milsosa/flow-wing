# Siplow

> Simple, Pipeable Flows

Siplow is a flow control library with support for pipeable tasks and flows with shared context.

It is built around two components: `Flow` and `Task`.

A `Flow` is the representation of a list of one or more `Task` instances and optionally additional piped flows that will be executed in `series`, `waterfall` or `parallel`.

A `Task` could be a normal function or a task created through `Task.create([id], handler, [...args])`.

# API

## flow(tasks, [options]) -> Flow

Main exposed `Flow` factory function. Alias for `flow.series()`

* `tasks` _Array&lt;Function|Task&gt; | Object{ string: Function|Task, ... }_ - It's an array or object of normal functions or `Task` instances
* `options` _Object_ - It's an optional options object

### Flow factory functions

- `flow.series(tasks, [options]) -> Flow`
- `flow.waterfall(tasks, [options]) -> Flow`
- `flow.parallel(tasks, [options]) -> Flow`

```js
const flow = require('siplow');
const Task = flow.Task;

const tasks = [
  (context) => Promise.resolve(1),
  Task.create('two', (context) => Promise.resolve(2)),
];

const seriesFlow = flow.series(tasks, options); // same as flow(tasks, options);
const waterfallFlow = flow.waterfall(tasks, options);
const parallelFlow = flow.parallel(tasks, options);
```

## flow.Task

The Task object that exposes the `.create()` factory function.

## Options

The allowed options that determine the flow's runtime (error handling, concurrency) and how the results should be returned.

```js
// Defaults
const options = {
  resultsAsArray: true, // To return the values as array when the tasks were an object
  abortOnError: true, // Whether abort Flow's execution on error or not
  concurrency: 0, // Parallel execution concurrency, 0 = no limit
  name: 'unnamed', // Flow's name
};
```

## Context

It could be any value and will be defaulted to an empty object (`{}`) when no value was provided.

## Task

The Task's handler function should have the following signature.

```js
/**
 * Task's handler signature
 *
 * @param Context context     The flow's runtime shared context
 * @param Any [pipedValue]    The previous piped Flow or Task result value. It will be
 *                            available only for flows running in waterfall or flows|tasks
 *                            that were piped into the running flow.
 * @param Any [...args]       The handler's specific additional arguments
 * @param Function [callback] The handler's callback. When not used a value or Promise should be returned
 */
function handler(context, pipedValue, ...args, callback) {
  // body
}

// Task public interface
const Task = {
  id: string,
  run(context, [value]) -> Promise,
  pipe(handler) -> Task, // Returns itself
}
```

### Methods

#### Task.create([id], handler, ...args) -> Task

Tasks factory function

#### run(context, [value]) -> Promise

The method to run the task's handler(s). This method is meant to be only called by the
flow the task belongs to.

#### pipe(handler) -> Task

This method allows to add additional handlers where the task's result value will be piped to.


## Flow

Represents a list of Tasks or Flows converted to Task with optionally additional piped Flows.

```js
// Flow public interface
const Flow = {
  name: string, // used only for debuggability
  type: 'series' | 'waterfall' | 'parallel', // used only for debuggability
  run(context) -> Promise,
  asTask([id]) -> Task,
  pipe(Flow) -> Flow, // Returns itself
  unpipe([Flow]) -> Flow, // Returns itself
};
```

### Methods

#### run(context) -> Promise

The main method to start the flow execution.

```js
flow.run(Context context) -> Promise
```

#### asTask([id]) -> Task

## Data

```js
const data = {
  context: Context,
  results: Array<any> | Object{ string: any, ... },
  errors: Array<TaskError>,
};
```

## Usage
