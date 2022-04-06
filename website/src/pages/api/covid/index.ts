import { createServer } from '@graphql-yoga/node';
import { NextApiRequest, NextApiResponse } from 'next';
import { getBuiltMesh } from './json-schema-covid/.mesh';

async function buildServer() {
  const mesh = await getBuiltMesh();
  const server = createServer({
    plugins: mesh.plugins,
    graphiql: {
      endpoint: '/api/covid',
      title: 'Mesh Covid Example',
      defaultQuery: /* GraphQL */ `
        # STEP3_2: 2 sources combined to get ratios & case & population
        query getData_step3_2 {
          fr: stat(country: "France") {
            deathRatio
            case {
              deaths
            }
            population {
              records {
                fields {
                  value
                }
              }
            }
          }
          at: stat(country: "Austria") {
            deathRatio
            case {
              deaths
            }
            population {
              records {
                fields {
                  value
                }
              }
            }
          }
        }
      `,
    },
  });

  return server;
}

const server$ = buildServer();

export default async function apiHandler(req: NextApiRequest, res: NextApiResponse) {
  const server = await server$;
  return server.requestListener(req, res);
}
