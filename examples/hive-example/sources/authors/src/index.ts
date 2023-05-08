import { createServer } from 'http';
import { createRouter, Response } from 'fets';

const authors = [
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
  const app = createRouter({
    components: {
      schemas: {
        Author: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
            },
            name: {
              type: 'string',
            },
            email: {
              type: 'string',
            },
          },
          required: ['id', 'name', 'email'],
          additionalProperties: false,
        },
      },
    } as const,
  })
    .route({
      method: 'GET',
      path: '/authors',
      operationId: 'authors',
      description: 'Returns a list of authors',
      schemas: {
        responses: {
          200: {
            description: 'A list of authors',
            type: 'array',
            items: {
              $ref: '#/components/schemas/Author',
            },
          },
        },
      } as const,
      handler: () => Response.json(authors),
    })
    .route({
      method: 'GET',
      path: '/authors/:id',
      operationId: 'author',
      description: 'Returns a single author',
      schemas: {
        request: {
          params: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
              },
            },
            additionalProperties: false,
            required: ['id'],
          },
        },
        responses: {
          200: {
            description: 'The author',
            $ref: '#/components/schemas/Author',
          },
        },
      } as const,
      handler(req) {
        const author = authors.find(author => author.id === req.params.id);

        if (!author) {
          return new Response(null, {
            status: 404,
          });
        }

        return Response.json(author, { status: 200 });
      },
    });

  const server = createServer(app);
  server.listen(4001, () => {
    console.log('Authors service Swagger UI; http://localhost:4001/docs');
  });
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
