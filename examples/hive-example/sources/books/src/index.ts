import { createServer } from 'http';
import { createRouter, Response } from '@whatwg-node/router';

interface Book {
  id: string;
  title: string;
  authorId: string;
}

const books: Book[] = [
  {
    id: '1',
    title: "The Hitchhiker's Guide to the Galaxy",
    authorId: '1',
  },
  {
    id: '2',
    title: 'The Restaurant at the End of the Universe',
    authorId: '2',
  },
  {
    id: '3',
    title: 'Life, the Universe and Everything',
    authorId: '1',
  },
];

async function main() {
  const app = createRouter();

  app.get(
    '/books',
    () =>
      new Response(JSON.stringify(books), {
        headers: {
          'Content-Type': 'application/json',
        },
      }),
  );

  app.get('/books/:id', req => {
    const book = books.find(book => book.id === req.params.id);

    if (!book) {
      return new Response(null, {
        status: 404,
      });
    }

    return new Response(JSON.stringify(book), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  });

  app.get('/books/authors/:authorId', req => {
    const authorBooks = books.filter(book => book.authorId === req.params.authorId);

    if (!authorBooks.length) {
      return new Response(null, {
        status: 404,
      });
    }

    return new Response(JSON.stringify(authorBooks), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  });

  const server = createServer(app);
  server.listen(4002, () => {
    console.log('Books service listening on port 4002');
  });
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
