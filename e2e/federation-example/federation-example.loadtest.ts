import os from 'os';
import { createTbench, type Tbench, type TbenchResult } from '@e2e/tbench';
import { createTenv, type Service } from '@e2e/tenv';

const { fs, serve, service, composeWithApollo } = createTenv(__dirname);

let tbench: Tbench;
beforeAll(async () => {
  tbench = await createTbench(
    // to give space for jest and the serve process.
    os.availableParallelism() - 2,
  );
});

let services!: Service[];
let supergraph!: string;
beforeAll(async () => {
  services = [
    await service('accounts'),
    await service('inventory'),
    await service('products'),
    await service('reviews'),
  ];

  supergraph = await composeWithApollo(services);
});

const threshold: TbenchResult = {
  maxCpu: Infinity, // we dont care
  maxMem: 500, // MB
  slowestRequest: 1, // second
};

it(`should perform within threshold ${JSON.stringify(threshold)}`, async () => {
  const supergraphFile = await fs.tempfile('supergraph.graphql');
  await fs.write(supergraphFile, supergraph);
  const server = await serve({ supergraph: supergraphFile });

  const result = await tbench.sustain({
    server,
    params: {
      query: /* GraphQL */ `
        fragment User on User {
          id
          username
          name
        }

        fragment Review on Review {
          id
          body
        }

        fragment Product on Product {
          inStock
          name
          price
          shippingEstimate
          upc
          weight
        }

        query TestQuery {
          users {
            ...User
            reviews {
              ...Review
              product {
                ...Product
                reviews {
                  ...Review
                  author {
                    ...User
                    reviews {
                      ...Review
                      product {
                        ...Product
                      }
                    }
                  }
                }
              }
            }
          }
          topProducts {
            ...Product
            reviews {
              ...Review
              author {
                ...User
                reviews {
                  ...Review
                  product {
                    ...Product
                  }
                }
              }
            }
          }
        }
      `,
    },
  });

  console.debug(result);

  expect(result.maxCpu).toBeLessThan(threshold.maxCpu);
  expect(result.maxMem).toBeLessThan(threshold.maxMem);
  expect(result.slowestRequest).toBeLessThan(threshold.slowestRequest);
});
