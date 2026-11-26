import { ApolloServer } from '@apollo/server';
import { getBuiltMesh } from './.mesh';

const isProd = process.env.NODE_ENV === 'production';
let apolloServer: ApolloServer;

export default async function createApolloServer() {
  if (apolloServer) return apolloServer;

  const { schema, cache, getEnveloped } = await getBuiltMesh();
  apolloServer = new ApolloServer({
    schema,
    introspection: !isProd,
    cache,
    // Custom executor keeps Mesh envelop + GraphQL 17 without apollo-server-micro's
    // graphql.formatError dependency (removed in GraphQL 17).
    executor: async requestContext => {
      const {
        schema: envelopedSchema,
        execute,
        contextFactory,
      } = getEnveloped({
        request: requestContext.request.http,
      });

      return execute({
        schema: envelopedSchema,
        document: requestContext.document,
        contextValue: await contextFactory(),
        variableValues: requestContext.request.variables,
        operationName: requestContext.operationName,
      });
    },
  });

  await apolloServer.start();
  return apolloServer;
}
