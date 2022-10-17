import { ApolloServer } from 'apollo-server';
import type { ServeMeshOptions } from '@graphql-mesh/runtime';

export default async function ({ getBuiltMesh, logger, argsPort = 4000 }: ServeMeshOptions): Promise<void> {
  const { schema, cache, getEnveloped } = await getBuiltMesh();
  const apolloServer = new ApolloServer({
    schema,
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

  const { url } = await apolloServer.listen(argsPort);
  logger.info(`🚀 Server ready at ${url}`);
}
