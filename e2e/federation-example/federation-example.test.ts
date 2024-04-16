import path from 'path';
import { createTenv, Service } from '@e2e/tenv';

const { fs, spawn, service, serve } = createTenv(__dirname);

let services!: Service[];
const supergraphConfig = { subgraphs: {} };
beforeAll(async () => {
  services = [
    await service('accounts'),
    await service('inventory'),
    await service('products'),
    await service('reviews'),
  ];
  for (const service of services) {
    supergraphConfig.subgraphs[service.name] = {
      routing_url: `http://0.0.0.0:${service.port}/graphql`,
      schema: {
        file: path.join(__dirname, 'services', service.name, 'typeDefs.graphql'),
      },
    };
  }
});

async function composeSupergraph(
  maskServicePorts?: boolean,
): Promise<[result: string, path: string]> {
  const supergraphConfigFile = await fs.tempfile('supergraph.json');
  await fs.write(supergraphConfigFile, JSON.stringify(supergraphConfig));

  const [proc, waitForExit] = await spawn(
    `yarn rover supergraph compose --config ${supergraphConfigFile}`,
  );
  await waitForExit;

  let result = proc.getStd('out');
  if (maskServicePorts) {
    for (const service of services) {
      result = result.replaceAll(service.port.toString(), `<${service.name}>`);
    }
  }

  const supergraphFile = await fs.tempfile('supergraph.graphql');
  await fs.write(supergraphFile, result);

  return [result, supergraphFile];
}

it('should compose supergraph with rover', async () => {
  const [result] = await composeSupergraph(true);
  expect(result).toMatchSnapshot();
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
  const [, supergraph] = await composeSupergraph();
  const { execute } = await serve({ supergraph });
  await expect(execute({ query })).resolves.toMatchSnapshot();
});
