import { ApolloServer } from 'apollo-server-micro';
import { getBuiltMesh } from './.mesh';

const isProd = process.env.NODE_ENV === 'production';
let apolloServer: ApolloServer;

export default async function createApolloServer() {
  if (apolloServer) return apolloServer;

  const { schema, contextBuilder } = await getBuiltMesh();

  apolloServer = new ApolloServer({
    schema,
    introspection: !isProd,
    playground: !isProd,
    context: contextBuilder,
  });

  return apolloServer;
}
