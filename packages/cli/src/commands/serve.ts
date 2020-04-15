import { GraphQLSchema } from 'graphql';
import { ApolloServer } from 'apollo-server';
import { ApolloServerExpressConfig } from 'apollo-server-express';
import { Logger } from 'winston';
import { KeyValueCache } from '@graphql-mesh/types';
import { fork as clusterFork, isMaster } from 'cluster';
import { cpus } from 'os';
import { loadDocuments } from '@graphql-toolkit/core';
import { CodeFileLoader } from '@graphql-toolkit/code-file-loader';
import { GraphQLFileLoader } from '@graphql-toolkit/graphql-file-loader';
import { basename } from 'path';

export async function serveMesh(
  logger: Logger,
  schema: GraphQLSchema,
  contextBuilder: (initialContextValue?: any) => Record<string, any>,
  cache?: KeyValueCache,
  fork?: string | number,
  port: string | number = 4000,
  exampleQuery?: string
) {
  if (isMaster && fork) {
    fork = fork > 1 ? fork : cpus().length;
    for (let i = 0; i < fork; i++) {
      clusterFork();
    }
    logger.info(`🕸️ => Serving GraphQL Mesh GraphiQL: http://localhost:${port} in ${fork} forks`);
  } else {
    const apolloOptions: ApolloServerExpressConfig = {
      schema,
      context: contextBuilder,
      cache,
    };

    if (exampleQuery) {
      const documents = await loadDocuments(exampleQuery, {
        loaders: [new CodeFileLoader(), new GraphQLFileLoader()],
        cwd: process.cwd(),
      });
      apolloOptions.playground = {
        tabs: documents.map(doc => ({
          name: doc.location && basename(doc.location),
          query: doc.rawSDL!,
        })),
      };
    }

    const apollo = new ApolloServer(apolloOptions);

    const { url } = await apollo.listen(port.toString());
    logger.info(`🕸️ => Serving GraphQL Mesh GraphiQL: ${url}`);
  }
}
