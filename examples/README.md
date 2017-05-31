# Examples

When running the examples you can set the `DEBUG` env variable to `flow-wing*`
(DEBUG=flow-wing*) in order to see a detailed log of what is going on.

Additionally you could pass the cli arguments `-v`/`--verbose` and `delay-factor-ms`
(in milliseconds) to some of the examples.

```bash
$ DEBUG=flow-wing* node examples/{example}.js {verbose-flag} {delay-factor-ms}
```

## Examples list

1. [tasks.js](tasks.js) - Shows how to create tasks, its handlers and how to pass custom task arguments.

2. [flows-as-tasks.js](flows-as-tasks.js) - Shows how to make a list of flows, convert these to tasks
and run them into another one.

3. [piped-flows.js](piped-flows.js) - Shows how to make a list of flows and pipe them together
so that when the main one runs it will pipe its results to the next one and so on (it's the same as waterfall).

4. [multiple-concurrent-executions.js](multiple-concurrent-executions.js) - Demonstrates that every flow.run()
has its own runtime/context data.

5. [requests-flow.js](requests-flow.js) - Creates two flows, one to retrieve the list of users from `https://jsonplaceholder.typicode.com` and the other one to retrieve every user's posts in parallel.

## How to run

In order to run the examples you'll need to:

1. `git clone {repo-url}/flow-wing`
2. `cd {clone-dir}/flow-wing`
3. `npm install`

And then you're ready to run the examples as follow:

```bash
# Running examples
$ DEBUG=flow-wing* node examples/tasks.js
$ DEBUG=flow-wing* node examples/requests-flow.js -v
$ DEBUG=flow-wing* node examples/piped-flows.js -v 10
```
