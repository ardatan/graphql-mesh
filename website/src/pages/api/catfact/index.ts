import { createServer } from '@graphql-yoga/node';
import { NextApiRequest, NextApiResponse } from 'next';
import { getBuiltMesh } from './.mesh';

async function buildServer() {
  const mesh = await getBuiltMesh();
  const server = createServer({
    plugins: mesh.plugins,
    graphiql: {
      endpoint: '/api/catfact',
      title: 'Catfact API',
      defaultQuery: /* GraphQL */ `
        query RandomFact {
          getRandomFact {
            fact
            length
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
