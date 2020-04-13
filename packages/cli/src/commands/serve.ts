import { GraphQLSchema } from 'graphql';
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
      res.end(`
      <!DOCTYPE html>
      <html>
      
      <head>
        <meta charset=utf-8/>
        <meta name="viewport" content="user-scalable=no, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, minimal-ui">
        <title>GraphQL Mesh Playground</title>
        <link rel="stylesheet" href="//cdn.jsdelivr.net/npm/graphql-playground-react/build/static/css/index.css" />
        <link rel="shortcut icon" href="//cdn.jsdelivr.net/npm/graphql-playground-react/build/favicon.png" />
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
        <script src="//cdn.jsdelivr.net/npm/graphql-playground-react/build/static/js/middleware.js"></script>
      </head>
      
      <body>
        <div id="root">
          <style>
            body {
              background-color: rgb(23, 42, 58);
              font-family: Open Sans, sans-serif;
              height: 90vh;
            }
      
            #root {
              height: 100%;
              width: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
            }
      
            .loading {
              font-size: 32px;
              font-weight: 200;
              color: rgba(255, 255, 255, .6);
              margin-left: 20px;
            }
      
            img {
              width: 78px;
              height: 78px;
            }
      
            .title {
              font-weight: 400;
            }
          </style>
          <img src='//cdn.jsdelivr.net/npm/graphql-playground-react/build/logo.png' alt=''>
          <div class="loading"> Loading
            <span class="title">GraphQL Mesh Playground</span>
          </div>
        </div>
        <script>window.addEventListener('load', function (event) {
            GraphQLPlayground.init(document.getElementById('root'), {
              // options as 'endpoint' belong here
              tabs: ${JSON.stringify(
                documents.map(doc => ({
                  name: doc.location && basename(doc.location),
                  endpoint: `http://localhost:${port}/graphql`,
                  query: doc.rawSDL,
                }))
              )}
            })
          })</script>
      </body>
      
      </html>
      `);
    });

    app.listen(port.toString(), (err, data) => {
      if (err) {
        console.error(err);
      }
      if (!fork) {
        logger.info(`🕸️ => Serving GraphQL Mesh GraphiQL: http://localhost:4000`);
      }
    });
  }
}
