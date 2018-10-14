'use strict';

const VError = require('verror');
const axios = require('axios');
const flow = require('../lib');
const Utils = require('./utils');

const { Task } = flow;
const context = {
  baseUrl: 'https://jsonplaceholder.typicode.com',
  postsPath: '/posts',
  usersPath: '/users'
};

const getUsers = Task.create('users', ctx => {
  return axios.get(ctx.baseUrl + ctx.usersPath)
    .then(response => response.data);
})
  .pipe(Utils.tapLog('users list'))
  .pipe((ctx, users) => users.map(user => ({ id: user.id, username: user.username })))
  .pipe(Utils.tapLog('transformed users list'));

const getPosts = (ctx, userId) => {
  return axios.get(`${ctx.baseUrl + ctx.postsPath}?userId=${userId}`)
    .then(response => response.data);
};

const getUsersPosts = (ctx, users) => {
  console.time('get posts run time');

  const getPostsTasks = users.map(user => {
    return Task.create(user.username, getPosts, user.id)
      .pipe(Utils.tapLog(`${user.username}: posts`))
      .pipe((ctx, posts) => {
        return posts.map(post => post.title);
      })
      .pipe(Utils.tapLog(`${user.username}: posts' titles`));
  });

  return flow.parallel(getPostsTasks, { name: 'posts', concurrency: getPostsTasks.length, resultsAsArray: false })
    .run(ctx)
    .then(data => {
      console.timeEnd('get posts run time');
      return data;
    });
};

const usersFlow = flow({ getUsers }, { name: 'users', resultsAsArray: true });

console.time('get users run time');
usersFlow.run(context)
  .then(data => {
    console.timeEnd('get users run time');
    Utils.prettyPrint('users flow results', data.results);

    return getUsersPosts(data.context, data.results);
  })
  .then(data => {
    Utils.prettyPrint('users posts results', data.results);
  })
  .catch(error => {
    // error = TaskError, a VError instance
    console.error(VError.fullStack(error));
    // The error's cause
    console.error(error.cause());
  });
