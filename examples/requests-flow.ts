import VError from 'verror';
import axios from 'axios';
import flow from '../src';
import * as Utils from './utils';

const { Task } = flow;

const context = {
  baseUrl: 'https://jsonplaceholder.typicode.com',
  postsPath: '/posts',
  usersPath: '/users'
};

interface User {
  id: number;
  username: string;
}

interface Post {
  title: string;
}

const getUsers = Task.create('users', (ctx: typeof context) => {
  return axios.get(ctx.baseUrl + ctx.usersPath)
    .then(response => response.data);
})
  .pipe(Utils.tapLog('users list'))
  .pipe((ctx: any, users: any[]) => users.map((user: any) => ({ id: user.id, username: user.username })))
  .pipe(Utils.tapLog('transformed users list'));

const getPosts = (ctx: typeof context, userId: number) => {
  return axios.get(`${ctx.baseUrl + ctx.postsPath}?userId=${userId}`)
    .then(response => response.data);
};

const getUsersPosts = (ctx: typeof context, users: User[]) => {
  console.time('get posts run time');

  const getPostsTasks = users.map(user => {
    return Task.create(user.username, getPosts, user.id)
      .pipe(Utils.tapLog(`${user.username}: posts`))
      .pipe((ctx: any, posts: any[]) => {
        return posts.map((post: any) => post.title);
      })
      .pipe(Utils.tapLog(`${user.username}: posts' titles`));
  });

  return flow.parallel(getPostsTasks, { name: 'posts', concurrency: getPostsTasks.length, resultsAsArray: false })
    .run(ctx)
    .then((data: any) => {
      console.timeEnd('get posts run time');
      return data;
    });
};

const usersFlow = flow.series({ getUsers }, { name: 'users', resultsAsArray: true });

console.time('get users run time');
usersFlow.run(context)
  .then((data: any) => {
    console.timeEnd('get users run time');
    Utils.prettyPrint('users flow results', data.results);

    return getUsersPosts(data.context, data.results);
  })
  .then((data: any) => {
    Utils.prettyPrint('users posts results', data.results);
  })
  .catch((error: any) => {
    // error = TaskError, a VError instance
    console.error(VError.fullStack(error));
    // The error's cause
    console.error((error as VError).cause());
  });
