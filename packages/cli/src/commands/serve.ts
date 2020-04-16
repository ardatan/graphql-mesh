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
import { basename, resolve } from 'path';
import { createServer } from 'http';
import { readFileSync } from 'fs';

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
    app.set('trust proxy', 'loopback');
    const httpServer = createServer(app);

    const apollo = new ApolloServer({
      schema,
      context: contextBuilder,
      cache,
      playground: false,
    });

    apollo.applyMiddleware({ app });
    apollo.installSubscriptionHandlers(httpServer);

    // For embedded examples
    app.get('/', async (req, res) => {
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

      const renderPageOptions: any = {
        title: 'GraphQL Mesh Playground',
        schema: introspectionFromSchema(schema),
        tabs: [],
      };

      if (exampleQuery) {
        const documents = await loadDocuments(exampleQuery, {
          loaders: [new CodeFileLoader(), new GraphQLFileLoader()],
          cwd: process.cwd(),
        });

        renderPageOptions.tabs = documents.map(doc => ({
          name: doc.location && basename(doc.location),
          query: doc.rawSDL!,
        }));
      }

      res.write(readFileSync(resolve(__dirname, './playground.html'), 'utf8'));
      res.write(`
      <script>
        window.addEventListener('load', function (event) {
          const renderPageOptions = ${JSON.stringify(renderPageOptions)};
          const endpoint = location.protocol + '//' + location.hostname + ':' + location.port + '/graphql';
          renderPageOptions.endpoint = endpoint;
          renderPageOptions.tabs.forEach(tab => {
            tab.endpoint = endpoint;
          });
          GraphQLPlayground.init(document.getElementById('root'), renderPageOptions)
        })
      </script>
      `);
      res.end();
    });

    httpServer.listen(port.toString(), () => {
      if (!fork) {
        logger.info(`🕸️ => Serving GraphQL Mesh GraphiQL: http://localhost:4000`);
      }
    });
  }
}
