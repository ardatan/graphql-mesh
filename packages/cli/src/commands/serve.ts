import { GraphQLSchema } from 'graphql';
import { ApolloServer } from 'apollo-server';
import { Logger } from 'winston';

export function serveMesh(
  logger: Logger,
  schema: GraphQLSchema,
  contextBuilder: () => Record<string, any>
) {
  const server = new ApolloServer({
    schema,
    context: () => {
      const context = contextBuilder();
      return context;
    }
  });

  server.listen().then(({ url }) => {
    logger.info(`🕸️ => Serving GraphQL Mesh GraphiQL: ${url}`);
  });
}
