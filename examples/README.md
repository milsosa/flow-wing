# Flow-wing Examples

When running the examples you can set the `DEBUG` env variable to `flow-wing*` (DEBUG=flow-wing*)
in order to see a detailed log of what is going on.

```bash
$ DEBUG=flow-wing* node examples/{example}.js
```

## Examples

1. `flows-as-tasks.js` - Shows how to make a list of flows, convert these to tasks
and run them into another one.

2. `piped-flows.js` - Shows how to make a list of flows and pipe them together
so that when the main one runs it will pipe its results to the next one and so on (it's the same as waterfall).

3. `requests-flow.js` - Creates two flows, one to retrieve the list of users from `https://jsonplaceholder.typicode.com` and the other one to retrieve every user's posts in parallel.

4. `tasks.js` - Shows how to create tasks, its handlers and how to pass custom task arguments.
