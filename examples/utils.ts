'use strict';

import util from 'util';

const verboseMatcher = /-v|--verbose/;
const verboseEnabled = process.argv
  .filter(arg => verboseMatcher.test(arg))
  .length > 0;

function prettyPrint(label: string, data: any): void {
  if (verboseEnabled) {
    console.log(`${label}`, util.inspect(data, { depth: 3 }));
  }
}

function tapLog(label: string): (ctx: any, result: any) => any {
  return (ctx: any, result: any): any => {
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
