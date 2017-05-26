'use strict';

const VError = require('verror');
const flow = require('../index');
const tapLog = require('./utils/tap-log');

const options = {
  resultsAsArray: true,
  abortOnError: false,
  concurrency: 5
};

const context = {
  some: 'data',
  delay: parseInt(process.argv[2], 10) || 100
};

const getOptions = (opts, name) => Object.assign({}, opts, { name });

const delayed = number => (ctx, previousResult, cb) => {
  cb = cb ? cb : previousResult;
  const delay = number * ctx.delay;
  setTimeout(() => {
    if (number === 3) {
      return cb(new Error('something went wrong with task ' + number));
    }

    cb(null, number);
  }, delay);
};

const oneToFive = flow.parallel({
  one: delayed(1),
  two: delayed(2),
  three: delayed(3),
  four: delayed(4),
  five: delayed(5)
}, getOptions(options, 'oneToFive'));

const tasks = [
  oneToFive.asTask().pipe(tapLog('oneToFive1')),
  oneToFive.asTask().pipe(tapLog('oneToFive2')),
  oneToFive.asTask().pipe(tapLog('oneToFive3')),
  oneToFive.asTask().pipe(tapLog('oneToFive4')),
  oneToFive.asTask().pipe(tapLog('oneToFive5'))
];

const testFlow = flow.waterfall(tasks, getOptions(options, 'mainFlow'));

for (let i = 0; i < 5; i++) {
  testFlow.run(context)
  .then(data => {
    console.log(`execution %d finished with %d errors`, i, data.errors.length);
    console.log('results: ', i, data.results);
  })
  .catch(err => {
    // err = TaskError, a VError instance
    console.error(VError.fullStack(err));
    // The error cause
    console.error(err.cause());
  });
}
