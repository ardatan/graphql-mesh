import { createServerAdapter } from '@whatwg-node/server';
import { Router } from 'itty-router';
import { Response } from '@whatwg-node/fetch';
import { createServer } from 'http';

interface Author {
  id: string;
  name: string;
  email: string;
}

const authors: Author[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@doe.com',
  },
  {
    id: '2',
    name: 'Jane Doe',
    email: 'jane@doe.com',
  },
];

async function main() {
  const app = createServerAdapter(Router());

  app.get(
    '/authors',
    () =>
      new Response(JSON.stringify(authors), {
        headers: {
          'Content-Type': 'application/json',
        },
      }),
  );

  app.get('/authors/:id', req => {
    const author = authors.find(author => author.id === req.params.id);

    if (!author) {
      return new Response(null, {
        status: 404,
      });
    }

    return new Response(JSON.stringify(author), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  });

  const server = createServer(app);
  server.listen(4001, () => {
    console.log('Authors service listening on port 4001');
  });
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
