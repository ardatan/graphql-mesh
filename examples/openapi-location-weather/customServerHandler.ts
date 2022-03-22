import { ApolloServer } from 'apollo-server';
import type { ServeMeshOptions } from '@graphql-mesh/runtime';

export default async function ({ getBuiltMesh, logger, argsPort }: ServeMeshOptions): Promise<void> {
  const { schema, getEnveloped } = await getBuiltMesh();
  const apolloServer = new ApolloServer({
    schema,
    context: ({ req }) => req,
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
