'use strict';

const Promise = require('bluebird');
const axios = require('axios');
const flow = require('./index');
const Task = flow.Task;

const baseUrl = 'https://jsonplaceholder.typicode.com';
const getUrl = (path) => baseUrl + path;

const getUsers = Task.create('users', (ctx) => {
  return axios.get(ctx.baseUrl + ctx.usersPath)
    .then(response => response.data);
})
.pipe(users => users.map(user => ({ id: user.id, username: user.username })));

const getPost = (userId, ctx) => {
  return axios.get(ctx.baseUrl + ctx.postsPath, { userId })
    .then(response => response.data);
};

const usersFlow = flow({ getUsers }, { resultsAsArray: false, abortOnError: false, returnErrors: false });

const getUsersPosts = (users, ctx) => {
  console.time('get posts run time');

  const getPostsTasks = users.map((user) => {
    return Task.create(user.username, getPost, user.id)
      .pipe((posts) => {
        return posts.map(post => post.title);
      });
  });

  return flow.parallel(getPostsTasks, { resultsAsArray: false, abortOnError: false, returnErrors: false, concurrency: getPostsTasks.length })
    .run(ctx)
    .then((data) => {
      console.timeEnd('get posts run time');
      return data;
    });
};

console.time('get users run time');
usersFlow.run({ baseUrl, postsPath: '/posts', usersPath: '/users' })
  .then((data) => {
    // console.log('serial results', data);
    console.timeEnd('get users run time');

    return getUsersPosts(data.results.users, data.context);
  })
  .then(results => console.log(results))
  .catch(console.error);
