'use strict';

const VError = require('verror');
const flow = require('../index');
const tapLog = require('./utils/tap-log');

const options = {
  resultsAsArray: true
};

const getOptions = (opts, name) => Object.assign({}, opts, { name });

const delayed = number => (ctx, previousResult, cb) => {
  cb = cb ? cb : previousResult;
  const delay = number * ctx.delay;
  setTimeout(() => cb(null, number), delay);
};

const oneToFive = flow.parallel({
  one: delayed(1),
  two: delayed(2),
  three: delayed(3),
  four: delayed(4),
  five: delayed(5)
}, getOptions(options, 'oneToFive'));

const sixToTen = flow.parallel({
  six: delayed(6),
  seven: delayed(7),
  eight: delayed(8),
  nine: delayed(9),
  ten: delayed(10)
}, getOptions(options, 'sixToTen'));

const elevenToFifteen = flow.parallel([
  delayed(11),
  delayed(12),
  delayed(13),
  delayed(14),
  delayed(15)
], getOptions(options, 'elevenToFifteen'));

const addTotal = flow({
  total(context, numbers) {
    // numbers = [[1, 2, 3, 4, 5], [6, 7, 8, 9, 10], [11, 12, 13, 14, 15]]
    return numbers.reduce((acc, item) => acc.concat(item), [])
      .reduce((sum, number) => sum + number, 0);
  }
});

const tasks = {
  oneToFive: oneToFive.asTask().pipe(tapLog('oneToFive')),
  sixToTen: sixToTen.asTask().pipe(tapLog('sixToTen')),
  elevenToFifteen: elevenToFifteen.asTask().pipe(tapLog('elevenToFifteen'))
};

const context = {
  some: 'data',
  delay: parseInt(process.argv[2], 10) || 100
};

flow.parallel(tasks, options)
  .pipe(addTotal)
  .run(context)
  .then(data => {
    console.log(data);
    // { context: { some: 'data', delay: 100 },
    //   results: { total: 120 } }
  })
  .catch(err => {
    // err = TaskError, a VError instance
    console.error(VError.fullStack(err));
    // The error cause
    console.error(err.cause());
  });
