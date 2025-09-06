import util from 'util';

const verboseMatcher = /-v|--verbose/;
const verboseEnabled = process.argv
  .filter(arg => verboseMatcher.test(arg))
  .length > 0;

export function prettyPrint(label: string, data: any): void {
  if (verboseEnabled) {
    console.log(`${label}`, util.inspect(data, { depth: 3 }));
  }
}

export function tapLog(label: string) {
  return (ctx: any, result: any): any => {
    prettyPrint(`${label} ctx:`, ctx);
    prettyPrint(`${label} result:`, result);
    return result;
  };
}

export function getDelayFactor(): number {
  const args = process.argv;
  const lastArg = args[args.length - 1];

  return parseInt(lastArg, 10) || 100;
}
