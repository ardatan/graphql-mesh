import path from 'path';
import { createTenv, type Service } from '@e2e/tenv';

const { fs, spawn, service, serve } = createTenv(__dirname);

let services!: Service[];
let supergraph!: string;
beforeAll(async () => {
  services = [
    await service('accounts'),
    await service('inventory'),
    await service('products'),
    await service('reviews'),
  ];

  const supergraphConfig = { subgraphs: {} };
  for (const service of services) {
    supergraphConfig.subgraphs[service.name] = {
      routing_url: `http://0.0.0.0:${service.port}/graphql`,
      schema: {
        file: path.join(__dirname, 'services', service.name, 'typeDefs.graphql'),
      },
    };
  }

  const supergraphConfigFile = await fs.tempfile('supergraph.json');
  await fs.write(supergraphConfigFile, JSON.stringify(supergraphConfig));

  const [proc, waitForExit] = await spawn(
    `yarn rover supergraph compose --config ${supergraphConfigFile}`,
  );
  await waitForExit;

  supergraph = proc.getStd('out');
});

it('should compose supergraph with rover', async () => {
  let maskedSupergraph = supergraph;
  for (const service of services) {
    maskedSupergraph = maskedSupergraph.replaceAll(service.port.toString(), `<${service.name}>`);
  }
  expect(maskedSupergraph).toMatchSnapshot();
});

it.concurrent.each([
  {
    name: 'TestQuery',
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
])('should execute $name', async ({ query }) => {
  const supergraphFile = await fs.tempfile('supergraph.graphql');
  await fs.write(supergraphFile, supergraph);
  const { execute } = await serve({ supergraph: supergraphFile });
  await expect(execute({ query })).resolves.toMatchSnapshot();
});
