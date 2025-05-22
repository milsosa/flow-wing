'use strict';

import Serial from './serial';
import Parallel from './parallel';

function series(tasks, runtime, flowOpts) {
  return Serial.run(tasks, runtime, flowOpts);
}

function waterfall(tasks, runtime, flowOpts) {
  return Serial.run(tasks, runtime, flowOpts);
}

function parallel(tasks, runtime, flowOpts) {
  return Parallel.run(tasks, runtime, flowOpts);
}

export default {
  series,
  waterfall,
  parallel
};
