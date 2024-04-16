import { parse } from 'graphql';
import { composeSubgraphs } from '@graphql-mesh/fusion-composition';
import { getExecutorForFusiongraph } from '@graphql-mesh/fusion-runtime';
import { createServeRuntime } from '@graphql-mesh/serve-runtime';
import { createDefaultExecutor } from '@graphql-tools/delegate';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import {
  createExecutablePlanForOperation,
  planOperation,
  serializeExecutableOperationPlan,
} from '../../../src/operations';
import { manufacturersSchema } from './services/manufacturers';
import { productsSchema } from './services/products';
import { storeFrontsSchema } from './services/storefronts';

describe('Array-batched type merging', () => {
  const fusiongraph = composeSubgraphs([
    {
      name: 'manufacturers',
      schema: manufacturersSchema,
    },
    {
      name: 'products',
      schema: productsSchema,
    },
    {
      name: 'storefronts',
      schema: storeFrontsSchema,
    },
  ]);
  it('composes the schema correctly', () => {
    expect(printSchemaWithDirectives(fusiongraph)).toMatchSnapshot();
  });
  const { fusiongraphExecutor } = getExecutorForFusiongraph({
    fusiongraph,
    transports() {
      return {
        getSubgraphExecutor({ subgraphName }) {
          switch (subgraphName) {
            case 'manufacturers':
              return createDefaultExecutor(manufacturersSchema);
            case 'products':
              return createDefaultExecutor(productsSchema);
            case 'storefronts':
              return createDefaultExecutor(storeFrontsSchema);
          }
        },
      };
    },
  });
  const exampleQueries = {
    'successful query': {
      query: /* GraphQL */ `
        query {
          storefront(id: "2") {
            id
            name
            products {
              upc
              name
              manufacturer {
                products {
                  upc
                  name
                }
                name
              }
            }
          }
        }
      `,
      expectedResult: {
        data: {
          storefront: {
            id: '2',
            name: 'BestBooks Online',
            products: [
              {
                manufacturer: {
                  name: 'Macmillan',
                  products: [
                    {
                      name: 'Apple Watch',
                      upc: '2',
                    },
                    {
                      name: 'Super Baking Cookbook',
                      upc: '3',
                    },
                    {
                      name: 'Best Selling Novel',
                      upc: '4',
                    },
                  ],
                },
                name: 'Super Baking Cookbook',
                upc: '3',
              },
              {
                manufacturer: {
                  name: 'Macmillan',
                  products: [
                    {
                      name: 'Apple Watch',
                      upc: '2',
                    },
                    {
                      name: 'Super Baking Cookbook',
                      upc: '3',
                    },
                    {
                      name: 'Best Selling Novel',
                      upc: '4',
                    },
                  ],
                },
                name: 'Best Selling Novel',
                upc: '4',
              },
              {
                manufacturer: {
                  name: 'Apple',
                  products: [
                    {
                      name: 'iPhone',
                      upc: '1',
                    },
                    {
                      name: 'iOS Survival Guide',
                      upc: '5',
                    },
                  ],
                },
                name: 'iOS Survival Guide',
                upc: '5',
              },
            ],
          },
        },
      },
    },
    errors: {
      query: /* GraphQL */ `
        query {
          products(upcs: ["6"]) {
            upc
            name
            manufacturer {
              name
            }
          }
        }
      `,
      expectedResult: {
        errors: [
          {
            message: 'Record not found',
            path: ['products', 0, 'manufacturer', 'name'],
            extensions: {
              code: 'NOT_FOUND',
            },
          },
        ],
        data: {
          products: [
            {
              upc: '6',
              name: 'Baseball Glove',
              manufacturer: null,
            },
          ],
        },
      },
    },
  };
  Object.entries(exampleQueries).forEach(([name, { query, expectedResult }]) => {
    describe(name, () => {
      it('plans correctly', () => {
        const plan = createExecutablePlanForOperation({
          fusiongraph,
          document: parse(query),
        });
        expect(serializeExecutableOperationPlan(plan)).toMatchSnapshot();
      });
      it(`gives correct results`, async () => {
        const result = await fusiongraphExecutor({
          document: parse(query),
        });
        expect(result).toMatchObject(expectedResult);
      });
    });
  });
});
