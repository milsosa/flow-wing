import Serial from './serial';
import Parallel from './parallel';
import { Task, Runtime, FlowOptions, RunnerResult } from '../types';

function series(tasks: Task[], runtime: Runtime, flowOpts: FlowOptions): Promise<RunnerResult> {
  return Serial.run(tasks, runtime, flowOpts);
}

function waterfall(tasks: Task[], runtime: Runtime, flowOpts: FlowOptions): Promise<RunnerResult> {
  return Serial.run(tasks, runtime, flowOpts);
}

function parallel(tasks: Task[], runtime: Runtime, flowOpts: FlowOptions): Promise<RunnerResult> {
  return Parallel.run(tasks, runtime, flowOpts);
}

export default {
  series,
  waterfall,
  parallel
};
