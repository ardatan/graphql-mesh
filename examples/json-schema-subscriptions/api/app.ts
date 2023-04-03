import { fetch as defaultFetch } from '@whatwg-node/fetch';
import { createRouter, Response } from '@whatwg-node/router';

export function createApi(fetch = defaultFetch) {
  const app = createRouter();
  let todos = [];

  app.get(
    '/todos',
    req =>
      new Response(JSON.stringify(todos), {
        headers: {
          'Content-Type': 'application/json',
        },
      }),
  );

  app.post('/todo', async request => {
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
    return new Response(JSON.stringify(todo), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  });

  return {
    app,
    resetTodos() {
      todos = [];
    },
  };
}
