import VError from 'verror';

export const privateMark = Symbol('@private_runtime_mark');

export type TaskHandler = (context: any, ...args: any[]) => any;

export interface Task {
  id: string;
  pipe(handler: TaskHandler, ...args: any[]): this;
  run(context: any, value: any): Promise<any>;
  flowAsTask?: boolean;
}

export interface Flow {
  name: string;
  mode: 'series' | 'waterfall' | 'parallel';
  run(context?: any, mainRuntime?: Runtime): Promise<FlowResult>;
  asTask(id: string): Task;
  pipe(flowToPipe: Flow): this;
  unpipe(flowToUnpipe?: Flow): this;
}

export interface Runtime {
  [privateMark]: boolean;
  flow: Flow;
  opts: FlowOptions;
  context: any;
  errors: VError[];
  previousResult?: any;
}

export interface FlowOptions {
  resultsAsArray?: boolean;
  abortOnError?: boolean;
  concurrency?: number;
  name?: string;
  mode?: 'series' | 'waterfall' | 'parallel';
  piped?: boolean;
}

export interface RunnerResult {
  errors: VError[];
  results: Record<string, any>;
}

export type Runner = (tasks: Task[], runtime: Runtime, flowOpts: FlowOptions) => Promise<RunnerResult>;

export interface FlowResult {
  results: any;
  errors: VError[];
  context: any;
}

export interface ParseOptions {
  resultsAsArray?: boolean;
  mode?: 'series' | 'waterfall' | 'parallel';
}

export type Results = any[] | Record<string, any>;
