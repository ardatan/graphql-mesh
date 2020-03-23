import { GraphQLSchema } from 'graphql';
import { ApolloServer } from 'apollo-server';
import { Logger } from 'winston';
import { KeyValueCache } from '@graphql-mesh/types';

export async function serveMesh(
  logger: Logger,
  schema: GraphQLSchema,
  contextBuilder: (initialContextValue?: any) => Record<string, any>,
  cache?: KeyValueCache,
): Promise<void> {
  const server = new ApolloServer({
    schema,
    context: contextBuilder,
    cache,
  });

  server.listen().then(({ url }) => {
    logger.info(`🕸️ => Serving GraphQL Mesh GraphiQL: ${url}`);
  });
}
