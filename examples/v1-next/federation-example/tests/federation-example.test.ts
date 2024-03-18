import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createServeRuntime } from '@graphql-mesh/serve-runtime';
import { accountsServer } from '../services/accounts/server';
import { inventoryServer } from '../services/inventory/server';
import { productsServer } from '../services/products/server';
import { reviewsServer } from '../services/reviews/server';

const problematicModulePath = join(__dirname, '../../../node_modules/core-js/features/array');
const emptyModuleContent = 'module.exports = {};';

const exampleQuery = readFileSync(join(__dirname, '../gateway/example-query.graphql'), 'utf8');
const expectedResult = {
  data: {
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
  },
};
// Fix core-js issue
mkdirSync(problematicModulePath, { recursive: true });
writeFileSync(join(problematicModulePath, './flat.js'), emptyModuleContent);
writeFileSync(join(problematicModulePath, './flat-map.js'), emptyModuleContent);

describe('Federation Example', () => {
  let servicesToStop: Array<{
    stop: () => Promise<void>;
  }> = [];
  const meshHttp = createServeRuntime({
    supergraph: join(__dirname, '../gateway/supergraph.graphql'),
  });
  beforeAll(async () => {
    try {
      servicesToStop = await Promise.all([
        accountsServer(),
        inventoryServer(),
        productsServer(),
        reviewsServer(),
      ]);
    } catch (e) {
      console.error(e);
    }
  });
  afterAll(async () => {
    await Promise.all(servicesToStop?.map(service => service.stop()));
  });
  it('should give correct response for example queries', async () => {
    const response = await meshHttp.fetch('/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: exampleQuery,
      }),
    });
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result).toMatchObject(expectedResult);
  });
});
