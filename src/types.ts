import VError from 'verror';

export const privateMark = Symbol('@private_runtime_mark');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TaskHandler = (context: any, ...args: any[]) => any;

export interface Task {
  id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pipe(handler: TaskHandler, ...args: any[]): this;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  run(context: any, value: any): Promise<any>;
  flowAsTask?: boolean;
}

export interface Flow {
  name: string;
  mode: 'series' | 'waterfall' | 'parallel';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  run(context?: any, mainRuntime?: Runtime): Promise<FlowResult>;
  asTask(id: string): Task;
  pipe(flowToPipe: Flow): this;
  unpipe(flowToUnpipe?: Flow): this;
}

export interface Runtime {
  [privateMark]: boolean;
  flow: Flow;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  opts: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any;
  errors: VError[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  results: Record<string, any>;
}

export interface FlowResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  results: any;
  errors: VError[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any;
}

export interface ParseOptions {
  resultsAsArray?: boolean;
  mode?: 'series' | 'waterfall' | 'parallel';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Results = any[] | Record<string, any>;
