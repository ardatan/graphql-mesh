import { GraphQLSchema, execute, subscribe } from 'graphql';
import express from 'express';
import { Logger } from 'winston';
import { fork as clusterFork, isMaster } from 'cluster';
import { cpus } from 'os';
import 'json-bigint-patch';
import { createServer } from 'http';
import { playground } from './playground';
import graphqlHTTP from 'express-graphql';
import { graphqlUploadExpress } from 'graphql-upload';
import { SubscriptionServer, OperationMessagePayload, ConnectionContext } from 'subscriptions-transport-ws';

export async function serveMesh(
  logger: Logger,
  schema: GraphQLSchema,
  contextBuilder: (initialContextValue?: any) => Promise<Record<string, any>>,
  fork?: string | number,
  port: string | number = 4000,
  exampleQuery?: string
): Promise<void> {
  const graphqlPath = '/graphql';
  if (isMaster && fork) {
    fork = fork > 1 ? fork : cpus().length;
    for (let i = 0; i < fork; i++) {
      clusterFork();
    }
    logger.info(`🕸️ => Serving GraphQL Mesh GraphiQL: http://localhost:${port}${graphqlPath} in ${fork} forks`);
  } else {
    const app = express();
    app.set('trust proxy', 'loopback');
    const httpServer = createServer(app);

    if (process.env.NODE_ENV?.toLowerCase() !== 'production') {
      const playgroundMiddleware = playground(exampleQuery, graphqlPath);
      app.get('/', playgroundMiddleware);
      app.get(graphqlPath, playgroundMiddleware);
    }

    app.use(
      graphqlUploadExpress({ maxFileSize: 10000000, maxFiles: 10 }),
      graphqlHTTP(async req => ({
        schema,
        context: await contextBuilder(req),
        graphiql: false,
      }))
    );

    SubscriptionServer.create(
      {
        schema,
        execute,
        subscribe,
        onConnect: async function (
          _params: OperationMessagePayload,
          _webSocket: WebSocket,
          connectionContext: ConnectionContext
        ) {
          const context = await contextBuilder(connectionContext.request);
          return context;
        },
      },
      {
        server: httpServer,
        path: graphqlPath,
      }
    );

    httpServer.listen(port.toString(), () => {
      if (!fork) {
        logger.info(`🕸️ => Serving GraphQL Mesh Playground: http://localhost:${port}${graphqlPath}`);
      }
    });
  }
}
