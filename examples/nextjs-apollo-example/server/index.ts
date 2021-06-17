import { NextApiRequest, NextApiResponse } from 'next';
import createApolloServer from './server';

type ApolloServerHandlerType = (req: NextApiRequest, res: NextApiResponse) => Promise<void>;

declare global {
  // NOTE: This actually needs to be a "var", let/const won't work here.
  var cachedApolloServerHandler: ApolloServerHandlerType;
}

const startApolloServer = async () => {
  if (!global.cachedApolloServerHandler) {
    const server = await createApolloServer();
    global.cachedApolloServerHandler = server.createHandler({
      path: '/api/graphql',
    });
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
