'use strict';

import VError from 'verror';
import axios from 'axios';
import type { AxiosResponse } from 'axios'; // Import AxiosResponse as type
import flow from '../lib';
import type { Flow, Task as TaskType, TaskInstance } from '../lib'; // Import Flow and Task types
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
  id: number; // Added id for completeness, though only title is used later
  userId: number;
  title: string;
  body: string; // Added body for completeness
  [key: string]: any; // Allow other properties from API
}

const mainContext: AppContext = { // Typed context
  baseUrl: 'https://jsonplaceholder.typicode.com',
  postsPath: '/posts',
  usersPath: '/users'
};

const getUsers: TaskInstance = Task.create('users', (ctx: AppContext) => { // Typed getUsers
  return axios.get<User[]>(ctx.baseUrl + ctx.usersPath)
    .then((response: AxiosResponse<User[]>) => response.data);
})
  .pipe(tapLog('users list'))
  .pipe((ctx: AppContext, users: User[]) => users.map((user: User) => ({ id: user.id, username: user.username }))) // Typed ctx
  .pipe(tapLog('transformed users list'));

const getPosts = (ctx: AppContext, userId: number): Promise<Post[]> => {
  return axios.get<Post[]>(`${ctx.baseUrl + ctx.postsPath}?userId=${userId}`)
    .then((response: AxiosResponse<Post[]>) => response.data);
};

interface UserPostsData {
  context: AppContext;
  results: Record<string, string[]>; // username: titles[]
}

const getUsersPosts = (ctx: AppContext, users: User[]): Promise<UserPostsData> => { // Return type for Promise
  console.time('get posts run time');

  const getPostsTasks: TaskInstance[] = users.map((user: User) => { // Typed getPostsTasks
    return Task.create(user.username, getPosts, user.id)
      .pipe(tapLog(`${user.username}: posts`))
      .pipe((taskCtx: AppContext, posts: Post[]) => { // Typed taskCtx
        return posts.map((post: Post) => post.title);
      })
      .pipe(tapLog(`${user.username}: posts' titles`));
  });

  return flow.parallel(getPostsTasks, { name: 'posts', concurrency: getPostsTasks.length, resultsAsArray: false })
    .run(ctx)
    .then((data: any) => { // data from flow.parallel is complex, using any for now but could be refined
      console.timeEnd('get posts run time');
      return data as UserPostsData; // Cast to expected structure
    });
};

const usersFlow: Flow = flow({ getUsers }, { name: 'users', resultsAsArray: true }); // Typed usersFlow

interface UsersFlowResult {
  results: User[]; // Expecting an array of User objects
  context: AppContext;
}

interface FinalResult {
  context: AppContext;
  results: Record<string, string[]>; // Matching UserPostsData results
}


console.time('get users run time');
usersFlow.run(mainContext) // Use typed context
  .then((data: UsersFlowResult) => { // Typed data
    console.timeEnd('get users run time');
    prettyPrint('users flow results', data.results);

    return getUsersPosts(data.context, data.results); // No need to cast data.results
  })
  .then((data: FinalResult) => { // Typed data
    prettyPrint('users posts results', data.results);
  })
  .catch((error: Error) => { // Typed error
    // error = TaskError, a VError instance
    console.error(VError.fullStack(error));
    // The error's cause
    if (error instanceof VError) {
      const cause = VError.cause(error); // Use VError.cause(error)
      console.error(cause);
    } else {
      console.error(error);
    }
  });
