# Examples

The examples in this directory are written in TypeScript and demonstrate how to use `flow-wing` in a typed environment.

When running the examples, you can set the `DEBUG` env variable to `flow-wing*`
(DEBUG=flow-wing*) in order to see a detailed log of what is going on.

Additionally, you could pass the cli arguments `-v`/`--verbose` and `delay-factor-ms`
(in milliseconds) to some of the examples.

```bash
$ DEBUG=flow-wing* npx ts-node examples/{example}.ts {verbose-flag} {delay-factor-ms}
```

## Examples list

1. [tasks.ts](tasks.ts) - Shows how to create tasks, its handlers and how to pass custom task arguments.

2. [flows-as-tasks.ts](flows-as-tasks.ts) - Shows how to make a list of flows, convert these to tasks
and run them into another one.

3. [piped-flows.ts](piped-flows.ts) - Shows how to make a list of flows and pipe them together
so that when the main one runs it will pipe its results to the next one and so on (it's the same as waterfall).

4. [multiple-concurrent-executions.ts](multiple-concurrent-executions.ts) - Demonstrates that every flow.run()
has its own runtime/context data.

5. [requests-flow.ts](requests-flow.ts) - Creates two flows, one to retrieve the list of users from `https://jsonplaceholder.typicode.com` and the other one to retrieve every user's posts in parallel.

## How to run

In order to run the examples you'll need to:

1. `git clone {repo-url}/flow-wing`
2. `cd {clone-dir}/flow-wing`
3. `npm install`

And then you're ready to run the examples as follow:

```bash
# Running examples
$ DEBUG=flow-wing* npx ts-node examples/tasks.ts
$ DEBUG=flow-wing* npx ts-node examples/requests-flow.ts -v
$ DEBUG=flow-wing* npx ts-node examples/piped-flows.ts -v 10
```
