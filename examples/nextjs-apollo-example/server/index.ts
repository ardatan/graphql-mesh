import type { NextApiRequest, NextApiResponse } from 'next';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import createApolloServer from './server';

type ApolloServerHandlerType = (req: NextApiRequest, res: NextApiResponse) => Promise<unknown>;

declare global {
  // NOTE: This actually needs to be a "var", let/const won't work here.
  var cachedApolloServerHandler: ApolloServerHandlerType;
}

const startApolloServer = async () => {
  if (!global.cachedApolloServerHandler) {
    const server = await createApolloServer();
    global.cachedApolloServerHandler = startServerAndCreateNextHandler(server);
  }
};

export async function getApolloServerHandler(req: NextApiRequest, res: NextApiResponse) {
  if (!global.cachedApolloServerHandler) {
    await startApolloServer().catch(e => {
      console.error(e);
    });
  }
  return global.cachedApolloServerHandler(req, res);
}
