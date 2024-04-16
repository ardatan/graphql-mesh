import { parse } from 'graphql';
import { composeSubgraphs } from '@graphql-mesh/fusion-composition';
import { getExecutorForFusiongraph } from '@graphql-mesh/fusion-runtime';
import { createDefaultExecutor } from '@graphql-tools/delegate';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import {
  createExecutablePlanForOperation,
  serializeExecutableOperationPlan,
} from '../../../src/operations';
import { productsSchema } from './services/products';
import { reviewsSchema } from './services/reviews';
import { usersSchema } from './services/users';

describe('Nullable merges', () => {
  const exampleQueries = [
    {
      name: 'regular',
      query: /* GraphQL */ `
        query {
          users(ids: [2]) {
            username
            reviews {
              body
            }
          }
          products(upcs: [2]) {
            name
            reviews {
              body
            }
          }
        }
      `,
      result: {
        data: {
          users: [
            {
              username: 'bigvader23',
              reviews: [],
            },
          ],
          products: [
            {
              name: 'Toothbrush',
              reviews: null,
            },
          ],
        },
      },
    },
    {
      name: 'null user result',
      query: /* GraphQL */ `
        query {
          _users(ids: ["DOES_NOT_EXIST"]) {
            id
            reviews {
              body
            }
          }
        }
      `,
      result: {
        data: {
          _users: [{ id: 'DOES_NOT_EXIST', reviews: [] }],
        },
      },
    },
    {
      name: 'null product result',
      query: /* GraphQL */ `
        query {
          _products(upcs: ["DOES_NOT_EXIST"]) {
            upc
            reviews {
              body
            }
          }
        }
      `,
      result: {
        data: {
          _products: [null],
        },
      },
    },
  ];
  const fusiongraph = composeSubgraphs([
    {
      name: 'products',
      schema: productsSchema,
    },
    {
      name: 'reviews',
      schema: reviewsSchema,
    },
    {
      name: 'users',
      schema: usersSchema,
    },
  ]);
  it('composes correctly', () => {
    expect(printSchemaWithDirectives(fusiongraph)).toMatchSnapshot();
  });
  const { fusiongraphExecutor } = getExecutorForFusiongraph({
    fusiongraph,
    transports() {
      return {
        getSubgraphExecutor({ subgraphName }) {
          switch (subgraphName) {
            case 'products':
              return createDefaultExecutor(productsSchema);
            case 'reviews':
              return createDefaultExecutor(reviewsSchema);
            case 'users':
              return createDefaultExecutor(usersSchema);
          }
        },
      };
    },
  });
  for (const { name, query, result: expectedResult } of exampleQueries) {
    describe(name, () => {
      it(`plans correctly`, async () => {
        const plan = createExecutablePlanForOperation({
          fusiongraph,
          document: parse(query),
        });
        expect(serializeExecutableOperationPlan(plan)).toMatchSnapshot();
      });
      it(`gives the correct result`, async () => {
        const result = await fusiongraphExecutor({
          document: parse(query),
        });
        expect(result).toEqual(expectedResult);
      });
    });
  }
});
