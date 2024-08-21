import { createTenv } from '@e2e/tenv';

const { compose, service, serve } = createTenv(__dirname);

it('should compose the appropriate schema', async () => {
  const { result } = await compose({
    services: [await service('authors'), await service('books')],
    maskServicePorts: true,
  });
  expect(result).toMatchSnapshot();
});

const queries = [
  {
    name: 'Author',
    query: /* GraphQL */ `
      query Author {
        author(id: 1) {
          id
          name
          books {
            id
            title
            author {
              id
              name
            }
          }
        }
      }
    `,
  },
  {
    name: 'Authors',
    query: /* GraphQL */ `
      query Authors {
        authors {
          id
          name
          books {
            id
            title
            author {
              id
              name
            }
          }
        }
      }
    `,
  },
  {
    name: 'Book',
    query: /* GraphQL */ `
      query Book {
        book(id: 1) {
          id
          title
          author {
            id
            name
            books {
              id
              title
            }
          }
        }
      }
    `,
  },
  {
    name: 'Books',
    query: /* GraphQL */ `
      query Books {
        books {
          id
          title
          author {
            id
            name
            books {
              id
              title
            }
          }
        }
      }
    `,
  },
];

it.concurrent.each(queries)('should execute $name', async ({ query }) => {
  const { output } = await compose({
    services: [await service('authors'), await service('books')],
    output: 'graphql',
  });

  const { execute } = await serve({ supergraph: output });
  await expect(execute({ query })).resolves.toMatchSnapshot();
});
