import { GraphQLSchema } from 'graphql';
import { ApolloServer } from 'apollo-server';
import { Logger } from 'winston';

export async function serveMesh(
  logger: Logger,
  schema: GraphQLSchema,
  contextBuilder: () => Record<string, any>
): Promise<void> {
  const server = new ApolloServer({
    schema,
    context: contextBuilder,
  });

  const { url } = await server.listen();
  logger.info(`🕸️ => Serving GraphQL Mesh GraphiQL: ${url}`);
}
