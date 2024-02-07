import { createRouter, Response } from 'fets';
import { fetch as defaultFetch } from '@whatwg-node/fetch';

export function createApi(fetch = defaultFetch) {
  let todos = [];

  const app = createRouter()
    .route({
      path: '/todos',
      method: 'GET',
      handler: () => Response.json(todos),
    })
    .route({
      path: '/todo',
      method: 'POST',
      async handler(request) {
        const reqBody = await request.json();
        const todo = {
          id: todos.length,
          ...reqBody,
        };
        todos.push(todo);
        await fetch('http://127.0.0.1:4000/webhooks/todo_added', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(todo),
        }).catch(console.log);
        return Response.json(todo);
      },
    });

  return {
    app,
    resetTodos() {
      todos = [];
    },
  };
}
