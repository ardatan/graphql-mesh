import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ApolloServer, BaseContext } from '@apollo/server';
import { findAndParseConfig } from '@graphql-mesh/cli';
import { getMesh, MeshInstance } from '@graphql-mesh/runtime';
import { accountsSubgraphServer } from '../services/accounts-subgraph/server';
import { accountsServer } from '../services/accounts/server';
import { inventoryServer } from '../services/inventory/server';
import { productsServer } from '../services/products/server';
import { reviewsServer } from '../services/reviews/server';

const problematicModulePath = join(__dirname, '../../../node_modules/core-js/features/array');
const emptyModuleContent = 'module.exports = {};';

const exampleQuery = readFileSync(join(__dirname, '../gateway/example-query.graphql'), 'utf8');
const expectedResult = {
  topProducts: [
    {
      inStock: true,
      name: 'Table',
      price: 899,
      reviews: [
        {
          author: {
            id: '1',
            name: 'Ada Lovelace',
            reviews: [
              {
                body: 'Love it!',
                id: '1',
                product: {
                  inStock: true,
                  name: 'Table',
                  price: 899,
                  shippingEstimate: 50,
                  upc: '1',
                  weight: 100,
                },
              },
              {
                body: 'Too expensive.',
                id: '2',
                product: {
                  inStock: false,
                  name: 'Couch',
                  price: 1299,
                  shippingEstimate: 0,
                  upc: '2',
                  weight: 1000,
                },
              },
            ],
            username: '@ada',
          },
          body: 'Love it!',
          id: '1',
        },
        {
          author: {
            id: '2',
            name: 'Alan Turing',
            reviews: [
              {
                body: 'Could be better.',
                id: '3',
                product: {
                  inStock: true,
                  name: 'Chair',
                  price: 54,
                  shippingEstimate: 25,
                  upc: '3',
                  weight: 50,
                },
              },
              {
                body: 'Prefer something else.',
                id: '4',
                product: {
                  inStock: true,
                  name: 'Table',
                  price: 899,
                  shippingEstimate: 50,
                  upc: '1',
                  weight: 100,
                },
              },
            ],
            username: '@complete',
          },
          body: 'Prefer something else.',
          id: '4',
        },
      ],
      shippingEstimate: 50,
      upc: '1',
      weight: 100,
    },
    {
      inStock: false,
      name: 'Couch',
      price: 1299,
      reviews: [
        {
          author: {
            id: '1',
            name: 'Ada Lovelace',
            reviews: [
              {
                body: 'Love it!',
                id: '1',
                product: {
                  inStock: true,
                  name: 'Table',
                  price: 899,
                  shippingEstimate: 50,
                  upc: '1',
                  weight: 100,
                },
              },
              {
                body: 'Too expensive.',
                id: '2',
                product: {
                  inStock: false,
                  name: 'Couch',
                  price: 1299,
                  shippingEstimate: 0,
                  upc: '2',
                  weight: 1000,
                },
              },
            ],
            username: '@ada',
          },
          body: 'Too expensive.',
          id: '2',
        },
      ],
      shippingEstimate: 0,
      upc: '2',
      weight: 1000,
    },
    {
      inStock: true,
      name: 'Chair',
      price: 54,
      reviews: [
        {
          author: {
            id: '2',
            name: 'Alan Turing',
            reviews: [
              {
                body: 'Could be better.',
                id: '3',
                product: {
                  inStock: true,
                  name: 'Chair',
                  price: 54,
                  shippingEstimate: 25,
                  upc: '3',
                  weight: 50,
                },
              },
              {
                body: 'Prefer something else.',
                id: '4',
                product: {
                  inStock: true,
                  name: 'Table',
                  price: 899,
                  shippingEstimate: 50,
                  upc: '1',
                  weight: 100,
                },
              },
            ],
            username: '@complete',
          },
          body: 'Could be better.',
          id: '3',
        },
      ],
      shippingEstimate: 25,
      upc: '3',
      weight: 50,
    },
  ],
  users: [
    {
      id: '1',
      name: 'Ada Lovelace',
      reviews: [
        {
          body: 'Love it!',
          id: '1',
          product: {
            inStock: true,
            name: 'Table',
            price: 899,
            reviews: [
              {
                author: {
                  id: '1',
                  name: 'Ada Lovelace',
                  reviews: [
                    {
                      body: 'Love it!',
                      id: '1',
                      product: {
                        inStock: true,
                        name: 'Table',
                        price: 899,
                        shippingEstimate: 50,
                        upc: '1',
                        weight: 100,
                      },
                    },
                    {
                      body: 'Too expensive.',
                      id: '2',
                      product: {
                        inStock: false,
                        name: 'Couch',
                        price: 1299,
                        shippingEstimate: 0,
                        upc: '2',
                        weight: 1000,
                      },
                    },
                  ],
                  username: '@ada',
                },
                body: 'Love it!',
                id: '1',
              },
              {
                author: {
                  id: '2',
                  name: 'Alan Turing',
                  reviews: [
                    {
                      body: 'Could be better.',
                      id: '3',
                      product: {
                        inStock: true,
                        name: 'Chair',
                        price: 54,
                        shippingEstimate: 25,
                        upc: '3',
                        weight: 50,
                      },
                    },
                    {
                      body: 'Prefer something else.',
                      id: '4',
                      product: {
                        inStock: true,
                        name: 'Table',
                        price: 899,
                        shippingEstimate: 50,
                        upc: '1',
                        weight: 100,
                      },
                    },
                  ],
                  username: '@complete',
                },
                body: 'Prefer something else.',
                id: '4',
              },
            ],
            shippingEstimate: 50,
            upc: '1',
            weight: 100,
          },
        },
        {
          body: 'Too expensive.',
          id: '2',
          product: {
            inStock: false,
            name: 'Couch',
            price: 1299,
            reviews: [
              {
                author: {
                  id: '1',
                  name: 'Ada Lovelace',
                  reviews: [
                    {
                      body: 'Love it!',
                      id: '1',
                      product: {
                        inStock: true,
                        name: 'Table',
                        price: 899,
                        shippingEstimate: 50,
                        upc: '1',
                        weight: 100,
                      },
                    },
                    {
                      body: 'Too expensive.',
                      id: '2',
                      product: {
                        inStock: false,
                        name: 'Couch',
                        price: 1299,
                        shippingEstimate: 0,
                        upc: '2',
                        weight: 1000,
                      },
                    },
                  ],
                  username: '@ada',
                },
                body: 'Too expensive.',
                id: '2',
              },
            ],
            shippingEstimate: 0,
            upc: '2',
            weight: 1000,
          },
        },
      ],
      username: '@ada',
    },
    {
      id: '2',
      name: 'Alan Turing',
      reviews: [
        {
          body: 'Could be better.',
          id: '3',
          product: {
            inStock: true,
            name: 'Chair',
            price: 54,
            reviews: [
              {
                author: {
                  id: '2',
                  name: 'Alan Turing',
                  reviews: [
                    {
                      body: 'Could be better.',
                      id: '3',
                      product: {
                        inStock: true,
                        name: 'Chair',
                        price: 54,
                        shippingEstimate: 25,
                        upc: '3',
                        weight: 50,
                      },
                    },
                    {
                      body: 'Prefer something else.',
                      id: '4',
                      product: {
                        inStock: true,
                        name: 'Table',
                        price: 899,
                        shippingEstimate: 50,
                        upc: '1',
                        weight: 100,
                      },
                    },
                  ],
                  username: '@complete',
                },
                body: 'Could be better.',
                id: '3',
              },
            ],
            shippingEstimate: 25,
            upc: '3',
            weight: 50,
          },
        },
        {
          body: 'Prefer something else.',
          id: '4',
          product: {
            inStock: true,
            name: 'Table',
            price: 899,
            reviews: [
              {
                author: {
                  id: '1',
                  name: 'Ada Lovelace',
                  reviews: [
                    {
                      body: 'Love it!',
                      id: '1',
                      product: {
                        inStock: true,
                        name: 'Table',
                        price: 899,
                        shippingEstimate: 50,
                        upc: '1',
                        weight: 100,
                      },
                    },
                    {
                      body: 'Too expensive.',
                      id: '2',
                      product: {
                        inStock: false,
                        name: 'Couch',
                        price: 1299,
                        shippingEstimate: 0,
                        upc: '2',
                        weight: 1000,
                      },
                    },
                  ],
                  username: '@ada',
                },
                body: 'Love it!',
                id: '1',
              },
              {
                author: {
                  id: '2',
                  name: 'Alan Turing',
                  reviews: [
                    {
                      body: 'Could be better.',
                      id: '3',
                      product: {
                        inStock: true,
                        name: 'Chair',
                        price: 54,
                        shippingEstimate: 25,
                        upc: '3',
                        weight: 50,
                      },
                    },
                    {
                      body: 'Prefer something else.',
                      id: '4',
                      product: {
                        inStock: true,
                        name: 'Table',
                        price: 899,
                        shippingEstimate: 50,
                        upc: '1',
                        weight: 100,
                      },
                    },
                  ],
                  username: '@complete',
                },
                body: 'Prefer something else.',
                id: '4',
              },
            ],
            shippingEstimate: 50,
            upc: '1',
            weight: 100,
          },
        },
      ],
      username: '@complete',
    },
  ],
};
// Fix core-js issue
mkdirSync(problematicModulePath, { recursive: true });
writeFileSync(join(problematicModulePath, './flat.js'), emptyModuleContent);
writeFileSync(join(problematicModulePath, './flat-map.js'), emptyModuleContent);

describe('Federation Example', () => {
  let servicesToStop: Array<ApolloServer<BaseContext>> = [];
  beforeAll(async () => {
    servicesToStop = await Promise.all([
      accountsServer(),
      accountsSubgraphServer(),
      inventoryServer(),
      productsServer(),
      reviewsServer(),
    ]);
  });
  afterAll(async () => {
    await Promise.all(servicesToStop.map(service => service.stop()));
  });
  describe('supergraph', () => {
    let mesh: MeshInstance;
    beforeAll(async () => {
      const config = await findAndParseConfig({
        dir: join(__dirname, '../gateway-supergraph'),
      });
      mesh = await getMesh(config);
    });
    it('should give correct response for example queries', async () => {
      const result = await mesh.execute(exampleQuery);
      expect(result?.data).toMatchObject(expectedResult);
    });
    afterAll(() => {
      mesh.destroy();
    });
  });
  describe.skip('regular', () => {
    let mesh: MeshInstance;
    beforeAll(async () => {
      const config = await findAndParseConfig({
        dir: join(__dirname, '../gateway'),
      });
      mesh = await getMesh(config);
    });
    it('should give correct response for example queries', async () => {
      const result = await mesh.execute(exampleQuery);
      expect(result?.errors).toBeFalsy();
      expect(result?.data).toMatchObject(expectedResult);
    });
    afterAll(() => {
      mesh.destroy();
    });
  });
});
