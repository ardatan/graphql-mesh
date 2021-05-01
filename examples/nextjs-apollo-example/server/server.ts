import path from 'path';
import { ApolloServer } from 'apollo-server-micro';
import { findAndParseConfig } from '@graphql-mesh/config';
import { getMesh } from '@graphql-mesh/runtime';

const isProd = process.env.NODE_ENV === 'production';
let apolloServer: ApolloServer;

export default async function createApolloServer() {
  if (apolloServer) return apolloServer;

  const config = await findAndParseConfig({
    dir: './server',
  });

  const { schema, contextBuilder } = await getMesh(config);

  apolloServer = new ApolloServer({
    schema,
    introspection: !isProd,
    playground: !isProd,
    context: contextBuilder,
  });

  return apolloServer;
}
