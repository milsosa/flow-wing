import createDebug from 'debug';
import * as Utils from '../utils';
import Runner from '../runner';
import Results from './results';
import createRuntime from './runtime';
import TaskFactory from './task';
import { Flow, Task, Runner as RunnerType, FlowOptions, Runtime, FlowResult, TaskHandler } from '../types';

function isPlainObject(obj: any): obj is object {
  return Object.prototype.toString.call(obj) === '[object Object]';
}

const defaultOptions: FlowOptions = {
  resultsAsArray: true,
  abortOnError: true,
  concurrency: Infinity,
  name: 'unnamed'
};

type TaskInput = Task | Flow | TaskHandler;

function prepareTasks(tasks: TaskInput[] | Record<string, TaskInput>): Task[] {
  const taskArray = isPlainObject(tasks) ? Object.values(tasks) : tasks;
  const taskIds = isPlainObject(tasks) ? Object.keys(tasks) : [];

  return taskArray.map((handler, index) => {
    const id = taskIds[index] || String(index);
    if (Utils.isFlow(handler)) {
      return handler.asTask(id);
    }

    if (!Utils.isTask(handler)) {
      return TaskFactory.create(id, handler);
    }

    handler.id = handler.id || id;
    return handler;
  });
}

function createFlow(runner: RunnerType, tasks: TaskInput[] | Record<string, TaskInput>, options?: FlowOptions): Flow {
  const opts: FlowOptions = {
    mode: runner.name as 'series' | 'waterfall' | 'parallel',
    resultsAsArray: !isPlainObject(tasks),
    ...defaultOptions,
    ...options,
  };

  const flowTasks = prepareTasks(tasks);
  const orderedIDs = flowTasks.map(task => task.id);
  const debug = createDebug(`flow-wing{${opts.name}}:${opts.mode}`);
  const pipedFlows: Flow[] = [];

  const flow: Flow = {
    name: opts.name as string,
    mode: opts.mode as 'series' | 'waterfall' | 'parallel',
    run(context?: any, mainRuntime?: Runtime): Promise<FlowResult> {
      const runtime = createRuntime(mainRuntime, context, flow, opts);
      debug('executing with options: %o', opts);

      return runner(flowTasks, runtime, opts)
        .then(data => {
          debug('execution finished successfully');
          const results = Results.parse(data.results, orderedIDs, opts);
          runtime.errors.push(...data.errors);
          runtime.previousResult = results;
          const flowResult: FlowResult = {
            results,
            errors: runtime.errors,
            context: runtime.context
          };
          return flowResult;
        })
        .then(data => {
          if (pipedFlows.length > 0) {
            debug('running %d piped flows', pipedFlows.length);
            const name = [flow.name].concat(pipedFlows.map(f => f.name)).join('>');
            const pipedFlowsOpts = { ...opts, name };
            return createFlow(Runner.waterfall, pipedFlows, pipedFlowsOpts)
              .run(runtime.context, runtime);
          }
          return data;
        })
        .then(data => {
          const isMainFlow = runtime.flow === flow;
          const onlyOneResult = Array.isArray(data.results) && data.results.length === 1;

          if (isMainFlow && onlyOneResult) {
            debug('unwrapping single task result');
            data.results = Results.extractLast(data.results);
          }
          return data;
        });
    },

    asTask(id: string): Task {
      debug('converting to task');
      const task = TaskFactory.create(id, (context: any, runtime: Runtime) => {
        return flow.run(context, runtime).then(data => data.results);
      });
      return Object.defineProperty(task, 'flowAsTask', { value: true });
    },

    pipe(flowToPipe: Flow): Flow {
      debug(`piping flow-wing{${flowToPipe.name}}:${flowToPipe.mode} into flow-wing{${flow.name}}:${flow.mode}`);
      opts.piped = true;
      pipedFlows.push(flowToPipe);
      return flow;
    },

    unpipe(flowToUnpipe?: Flow): Flow {
      if (!flowToUnpipe) {
        pipedFlows.splice(0, pipedFlows.length);
        opts.piped = false;
        debug('all piped flows were un-piped');
        return flow;
      }
      const index = pipedFlows.findIndex(f => f === flowToUnpipe);
      if (index > -1) {
        opts.piped = pipedFlows.length > 0;
        pipedFlows.splice(index, 1);
        debug(`flow-wing{${flowToUnpipe.name}}:${flowToUnpipe.mode} was un-piped`);
      } else {
        debug(`the flow-wing{${flowToUnpipe.name}}:${flowToUnpipe.mode} is not piped into this one`);
      }
      return flow;
    }
  };

  return flow;
}

const flow = createFlow.bind(null, Runner.series);
const series = createFlow.bind(null, Runner.series);
const waterfall = createFlow.bind(null, Runner.waterfall);
const parallel = createFlow.bind(null, Runner.parallel);

export default Object.assign(flow, {
  series,
  waterfall,
  parallel,
  Task: TaskFactory,
});
