import { GraphQLSchema, introspectionFromSchema } from 'graphql';
import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import { Logger } from 'winston';
import { KeyValueCache } from '@graphql-mesh/types';
import { fork as clusterFork, isMaster } from 'cluster';
import { cpus } from 'os';
import { loadDocuments } from '@graphql-toolkit/core';
import { CodeFileLoader } from '@graphql-toolkit/code-file-loader';
import { GraphQLFileLoader } from '@graphql-toolkit/graphql-file-loader';
import { basename } from 'path';
import { renderPlaygroundPage } from 'graphql-playground-html';
import { createServer } from 'http';

export async function serveMesh(
  logger: Logger,
  schema: GraphQLSchema,
  contextBuilder: (initialContextValue?: any) => Record<string, any>,
  cache?: KeyValueCache,
  fork?: string | number,
  port: string | number = 4000,
  exampleQuery?: string
): Promise<void> {
  if (isMaster && fork) {
    fork = fork > 1 ? fork : cpus().length;
    for (let i = 0; i < fork; i++) {
      clusterFork();
    }
    logger.info(`🕸️ => Serving GraphQL Mesh GraphiQL: http://localhost:${port} in ${fork} forks`);
  } else {
    const app = express();

    const apollo = new ApolloServer({
      schema,
      context: contextBuilder,
      cache,
      playground: false,
    });

    apollo.applyMiddleware({ app });

    const documents = exampleQuery
      ? await loadDocuments(exampleQuery, {
          loaders: [new CodeFileLoader(), new GraphQLFileLoader()],
          cwd: process.cwd(),
        })
      : [];

    // For embedded examples
    app.get('/', (req, res) => {
      res.setHeader('Content-Type', 'text/html');
      res.write(`
      <script>
          const localStorageMock = new Map();
          Object.defineProperty(window, 'localStorage', {
            get() {
              return {
                getItem(key) {
                  return localStorageMock.get(key);
                },
                setItem(key, val) {
                  return localStorageMock.set(key, val);
                },
                clear() {
                  return localStorageMock.clear();
                },
                key(i) {
                  return localStorageMock.keys()[i];
                },
                remove(key) {
                  return localStorageMock.delete(key);
                },
                get length() {
                  return localStorageMock.size;
                }
              }
            }
          });
        </script>
      `);
      const endpoint = `http://localhost:${port}/graphql`;
      const tabs = documents.map(doc => ({
        name: doc.location && basename(doc.location),
        endpoint,
        query: doc.rawSDL!,
      }));
      const playground = renderPlaygroundPage({
        title: 'GraphQL Mesh Playground',
        tabs,
        endpoint,
        schema: introspectionFromSchema(schema),
      });
      res.write(playground);
      res.end();
    });

    const httpServer = createServer(app);
    apollo.installSubscriptionHandlers(httpServer);

    httpServer.listen(port.toString(), () => {
      if (!fork) {
        logger.info(`🕸️ => Serving GraphQL Mesh GraphiQL: http://localhost:4000`);
      }
    });
  }
}
