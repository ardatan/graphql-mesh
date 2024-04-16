import { buildSchema, parse } from 'graphql';
import { createTenv } from '@e2e/tenv';
import {
  createExecutablePlanForOperation,
  serializeExecutableOperationPlan,
} from '@graphql-mesh/fusion-execution';
import { getExecutorForFusiongraph } from '@graphql-mesh/fusion-runtime';

const { compose, service } = createTenv(__dirname);

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
    document: parse(/* GraphQL */ `
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
    `),
  },
  {
    name: 'Authors',
    document: parse(/* GraphQL */ `
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
    `),
  },
  {
    name: 'Book',
    document: parse(/* GraphQL */ `
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
    `),
  },
  {
    name: 'Books',
    document: parse(/* GraphQL */ `
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
    `),
  },
];

it.concurrent.each(queries)('should properly plan $name', async ({ document }) => {
  const { result } = await compose({
    services: [await service('authors'), await service('books')],
  });

  const plan = createExecutablePlanForOperation({
    fusiongraph: buildSchema(result, { assumeValid: true }),
    document,
  });

  expect(serializeExecutableOperationPlan(plan)).toMatchSnapshot();
});

it.concurrent.each(queries)('should execute $name', async ({ document }) => {
  const { result } = await compose({
    services: [await service('authors'), await service('books')],
  });

  const { fusiongraphExecutor } = getExecutorForFusiongraph({ fusiongraph: result });

  await expect(fusiongraphExecutor({ document })).resolves.toMatchSnapshot();
});
