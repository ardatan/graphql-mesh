import { ApolloServer } from 'apollo-server-micro';
import { getBuiltMesh } from './.mesh';

const isProd = process.env.NODE_ENV === 'production';
let apolloServer: ApolloServer;

export default async function createApolloServer() {
  if (apolloServer) return apolloServer;

  const { schema, cache, getEnveloped } = await getBuiltMesh();
  apolloServer = new ApolloServer({
    schema,
    introspection: !isProd,
    playground: !isProd,
    cache,
    executor: async requestContext => {
      const { schema, execute, contextFactory } = getEnveloped({ req: requestContext.request.http });

      return execute({
        schema: schema,
        document: requestContext.document,
        contextValue: await contextFactory(),
        variableValues: requestContext.request.variables,
        operationName: requestContext.operationName,
      });
    },
  });

  return apolloServer;
}
