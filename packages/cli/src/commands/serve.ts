import { GraphQLSchema } from 'graphql';
import { ApolloServer } from 'apollo-server';
import { Logger } from 'winston';
import { KeyValueCache } from '@graphql-mesh/types';
import { fork as clusterFork, isMaster } from 'cluster';
import { cpus } from 'os';

export async function serveMesh(
  logger: Logger,
  schema: GraphQLSchema,
  contextBuilder: (initialContextValue?: any) => Record<string, any>,
  cache?: KeyValueCache,
  fork?: string | number
): Promise<void> {
  if (isMaster && fork) {
    fork = fork > 1 ? fork : cpus().length;
    for (let i = 0; i < fork; i++) {
      clusterFork();
    }
    logger.info(`🕸️ => Serving GraphQL Mesh GraphiQL: http://localhost:4000 in ${fork} forks`);
  } else {
    const server = new ApolloServer({
      schema,
      context: contextBuilder,
      cache,
    });

    const { url } = await server.listen();
    if (!fork) {
      logger.info(`🕸️ => Serving GraphQL Mesh GraphiQL: ${url}`);
    }
  }
}
