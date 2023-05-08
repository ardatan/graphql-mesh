import { createServer } from 'http';
import { createRouter, Response } from 'fets';

const books = [
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
  const app = createRouter({
    components: {
      schemas: {
        Book: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
            },
            title: {
              type: 'string',
            },
            authorId: {
              type: 'string',
            },
          },
          required: ['id', 'title', 'authorId'],
          additionalProperties: false,
        },
      },
    } as const,
  })
    .route({
      method: 'GET',
      path: '/books',
      operationId: 'books',
      description: 'Returns a list of books',
      schemas: {
        responses: {
          200: {
            description: 'A list of books',
            type: 'array',
            items: {
              $ref: '#/components/schemas/Book',
            },
          },
        },
      } as const,
      handler: () => Response.json(books),
    })
    .route({
      method: 'GET',
      path: '/books/:id',
      operationId: 'book',
      description: 'Returns a book',
      schemas: {
        request: {
          params: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
              },
            },
            required: ['id'],
            additionalProperties: false,
          },
        },
        responses: {
          200: {
            description: 'A book',
            $ref: '#/components/schemas/Book',
          },
        },
      } as const,
      handler: req => {
        const book = books.find(book => book.id === req.params.id);

        if (!book) {
          return new Response(null, {
            status: 404,
          });
        }

        return Response.json(book);
      },
    })
    .route({
      method: 'GET',
      path: '/books/authors/:authorId',
      operationId: 'booksByAuthor',
      description: 'Returns a list of books by author',
      schemas: {
        request: {
          params: {
            type: 'object',
            properties: {
              authorId: {
                type: 'string',
              },
            },
            required: ['authorId'],
            additionalProperties: false,
          },
        },
        responses: {
          200: {
            description: 'A list of books',
            type: 'array',
            items: {
              $ref: '#/components/schemas/Book',
            },
          },
        },
      } as const,
      handler: req => {
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
      },
    });

  const server = createServer(app);
  server.listen(4002, () => {
    console.log('Books service Swagger UI; http://localhost:4001/docs');
  });
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
