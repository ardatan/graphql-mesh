import { createServer } from 'http';
import { createRouter, Response } from 'fets';
import { Opts } from '@e2e/opts';
import { fetch } from '@whatwg-node/fetch';

const opts = Opts(process.argv);

let todos = [];

const app = createRouter<FetchEvent>()
  .route({
    path: '/todos',
    method: 'GET',
    handler: () => Response.json(todos),
  })
  .route({
    path: '/todo',
    method: 'POST',
    async handler(request, { waitUntil }) {
      const reqBody = await request.json();
      const todo = {
        id: todos.length,
        ...reqBody,
      };
      todos.push(todo);
      waitUntil(
        fetch(`http://localhost:${opts.getPort(true)}/webhooks/todo_added`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(todo),
        })
          .then(res =>
            res.text().then(resText =>
              console.log('Webhook payload sent', {
                status: res.status,
                statusText: res.statusText,
                body: resText,
                headers: Object.fromEntries(res.headers.entries()),
              }),
            ),
          )
          .catch(err => console.error('Webhook payload failed', err)),
      );
      return Response.json(todo);
    },
  });

const port = opts.getServicePort('api', true);

createServer(app).listen(port, () => {
  console.log(`API service listening on http://localhost:${port}`);
});
