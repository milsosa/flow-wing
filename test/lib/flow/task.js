import test from 'ava';
// import { range } from 'range';
// import sinon from 'sinon';
import { Task } from '../../../lib/flow';

// const generateTasks = (from, to) => {
//   return range(from, to)
//     .map(number => sinon.stub().returns(number));
// };

test('should expose the static .create() method', t => {
  t.is(typeof Task.create, 'function', 'Task.create should be a function');
});
