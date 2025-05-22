'use strict';

import VError from 'verror';
import axios, { AxiosResponse } from 'axios'; // Import AxiosResponse
import flow from '../lib';
import { tapLog, prettyPrint } from './utils'; // Named import

const { Task } = flow;

interface AppContext {
  baseUrl: string;
  postsPath: string;
  usersPath: string;
  [key: string]: any; // Allow other properties if needed by flow context
}

interface User {
  id: number;
  username: string;
  [key: string]: any; // Allow other properties from API
}

interface Post {
  title: string;
  [key: string]: any; // Allow other properties from API
}

type FlowTask = any; // Placeholder for flow instance types

const context: AppContext = {
  baseUrl: 'https://jsonplaceholder.typicode.com',
  postsPath: '/posts',
  usersPath: '/users'
};

const getUsers: FlowTask = Task.create('users', (ctx: AppContext) => {
  return axios.get<User[]>(ctx.baseUrl + ctx.usersPath) // Specify type for axios.get
    .then((response: AxiosResponse<User[]>) => response.data);
})
  .pipe(tapLog('users list'))
  .pipe((ctx: any, users: User[]) => users.map((user: User) => ({ id: user.id, username: user.username })))
  .pipe(tapLog('transformed users list'));

const getPosts = (ctx: AppContext, userId: number): Promise<Post[]> => {
  return axios.get<Post[]>(`${ctx.baseUrl + ctx.postsPath}?userId=${userId}`) // Specify type for axios.get
    .then((response: AxiosResponse<Post[]>) => response.data);
};

const getUsersPosts = (ctx: AppContext, users: User[]): Promise<any> => {
  console.time('get posts run time');

  const getPostsTasks: any[] = users.map((user: User) => {
    return Task.create(user.username, getPosts, user.id)
      .pipe(tapLog(`${user.username}: posts`))
      .pipe((taskCtx: any, posts: Post[]) => { // Renamed ctx to taskCtx to avoid conflict
        return posts.map((post: Post) => post.title);
      })
      .pipe(tapLog(`${user.username}: posts' titles`));
  });

  return flow.parallel(getPostsTasks, { name: 'posts', concurrency: getPostsTasks.length, resultsAsArray: false })
    .run(ctx)
    .then((data: any) => {
      console.timeEnd('get posts run time');
      return data;
    });
};

const usersFlow: FlowTask = flow({ getUsers }, { name: 'users', resultsAsArray: true });

console.time('get users run time');
usersFlow.run(context)
  .then((data: { results: any; context: AppContext }) => { // Added context to data type
    console.timeEnd('get users run time');
    prettyPrint('users flow results', data.results);

    return getUsersPosts(data.context, data.results as User[]); // Cast data.results
  })
  .then((data: any) => {
    prettyPrint('users posts results', data.results);
  })
  .catch((error: any) => { // VError type could be more specific
    // error = TaskError, a VError instance
    console.error(VError.fullStack(error));
    // The error's cause
    if (error instanceof VError) {
      console.error(error.cause());
    } else {
      console.error(error);
    }
  });
