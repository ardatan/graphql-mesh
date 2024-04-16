import { parse, print } from 'graphql';
import { composeSubgraphs } from '@graphql-mesh/fusion-composition';
import { getExecutorForFusiongraph } from '@graphql-mesh/fusion-runtime';
import { createBatchingExecutor } from '@graphql-tools/batch-execute';
import { createDefaultExecutor } from '@graphql-tools/delegate';
import { Executor, printSchemaWithDirectives } from '@graphql-tools/utils';
import { manufacturersSchema } from './services/manufacturers';
import { productsSchema } from './services/products';
import { storefrontsSchema } from './services/storefronts';

describe('Single-record type merging', () => {
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
      schema: storefrontsSchema,
    },
  ]);
  it('composes the schema correctly', () => {
    expect(printSchemaWithDirectives(fusiongraph)).toMatchSnapshot();
  });
  let cnt = 0;
  const { fusiongraphExecutor } = getExecutorForFusiongraph({
    fusiongraph,
    transports() {
      return {
        getSubgraphExecutor({ subgraphName }) {
          switch (subgraphName) {
            case 'manufacturers':
              return createDefaultExecutor(manufacturersSchema);
            case 'products':
              const productsExecutor = createDefaultExecutor(productsSchema);
              const wrappedProductExecutor: Executor = function wrappedProductExecutor(...args) {
                cnt++;
                return productsExecutor(...args);
              };
              return createBatchingExecutor(wrappedProductExecutor);
            case 'storefronts':
              return createDefaultExecutor(storefrontsSchema);
          }
        },
      };
    },
  });
  it('example query', async () => {
    const result = await fusiongraphExecutor({
      document: parse(/* GraphQL */ `
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
      `),
    });
    expect(result).toEqual({
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
                    name: 'Apple Watch',
                    upc: '2',
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
    });
  });
  it('should batch', async () => {
    const result = await fusiongraphExecutor({
      document: parse(/* GraphQL */ `
        query {
          storefront(id: "2") {
            products {
              upc
              name
            }
          }
        }
      `),
    });
    expect(result).toEqual({
      data: {
        storefront: {
          products: [
            {
              name: 'Super Baking Cookbook',
              upc: '3',
            },
            {
              name: 'Best Selling Novel',
              upc: '4',
            },
            {
              name: 'iOS Survival Guide',
              upc: '5',
            },
          ],
        },
      },
    });

    expect(cnt).toBe(1);
  });
});
