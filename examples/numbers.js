'use strict';

const Promise = require('bluebird');
const flow = require('../index');
const Task = flow.Task;

const options = {
  resultsAsArray: false,
};

const delayed = (num, piped) => (ctx, prev, cb) => {
  cb = !cb ? prev : cb;
  const delay = num * ctx.delayFactor;
  setTimeout(() => cb(null, { num, delay }), delay)
};

const log = (ctx, result) => {
  console.log('result: %j, with ctx: %j, was piped', result, ctx);
  return result;
};

const oneToFive = flow({
  one: delayed(1),
  two: delayed(2),
  three: delayed(3),
  four: delayed(4),
  five: delayed(5),
}, options);

const sixToTen = flow({
  six: delayed(6),
  seven: delayed(7),
  eight: delayed(8),
  nine: delayed(9),
  ten: delayed(10),
}, options);


const tasks = {
  oneToFive: oneToFive.asTask().pipe(log),
  sixToTen: sixToTen.asTask().pipe(log),
}

const context = {
  some: 'data',
  delayFactor: parseInt(process.argv[2]) || 100,
};

flow.waterfall(tasks, options)
  .run(context)
  .then((data) => {
    console.log(data.results);
  });
