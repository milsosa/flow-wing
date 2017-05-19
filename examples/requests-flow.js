'use strict';

const VError = require('verror');
const axios = require('axios');
const tapLog = require('./utils/tap-log');
const flow = require('../index');

const Task = flow.Task;
const context = {
  baseUrl: 'https://jsonplaceholder.typicode.com',
  postsPath: '/posts',
  usersPath: '/users'
};

const getUsers = Task.create('users', ctx => {
  return axios.get(ctx.baseUrl + ctx.usersPath)
    .then(response => response.data);
})
// .pipe(tapLog('users list'))
.pipe((ctx, users) => users.map(user => ({ id: user.id, username: user.username })));
// .pipe(tapLog('transformed users list'));

const getPosts = (ctx, userId) => {
  return axios.get(`${ctx.baseUrl + ctx.postsPath}?userId=${userId}`)
    .then(response => response.data);
};

const getUsersPosts = (ctx, users) => {
  console.time('get posts run time');

  const getPostsTasks = users.map(user => {
    return Task.create(user.username, getPosts, user.id)
      // .pipe(tapLog(`${user.username}: posts`))
      .pipe((ctx, posts) => {
        return posts.map(post => post.title);
      });
      // .pipe(tapLog(`${user.username}: posts' titles`));
  });

  return flow.parallel(getPostsTasks, { name: 'posts', concurrency: getPostsTasks.length })
    .run(ctx)
    .then(data => {
      console.timeEnd('get posts run time');
      return data;
    });
};

const usersFlow = flow({ getUsers }, { name: 'users' });

console.time('get users run time');
usersFlow.run(context)
  .then(data => {
    console.timeEnd('get users run time');

    return getUsersPosts(data.context, data.results.users);
  })
  .then(data => console.log(data))
  .catch(err => {
    // err = TaskError, a VError instance
    console.error(VError.fullStack(err));
    // The error cause
    console.error(err.cause());
  });
