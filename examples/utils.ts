'use strict';

import util from 'util';

// Define a generic type for context and result to make tapLog more versatile
type AnyObject = Record<string, any>;

const verboseMatcher = /-v|--verbose/;
const verboseEnabled = process.argv
  .filter(arg => verboseMatcher.test(arg))
  .length > 0;

function prettyPrint(label: string, data: any): void { // data can be any type
  if (verboseEnabled) {
    console.log(`${label}`, util.inspect(data, { depth: 3 }));
  }
}

// Add a more specific return type for tapLog
function tapLog<TContext extends AnyObject, TResult>(label: string): (ctx: TContext, result: TResult) => TResult {
  return (ctx: TContext, result: TResult): TResult => {
    prettyPrint(`${label} ctx:`, ctx);
    prettyPrint(`${label} result:`, result);
    return result;
  };
}

function getDelayFactor(): number {
  const args: string[] = process.argv;
  const lastArg: string | undefined = args[args.length - 1];

  return parseInt(lastArg, 10) || 100;
}

export {
  tapLog,
  prettyPrint,
  getDelayFactor
};
