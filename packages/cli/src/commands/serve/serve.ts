import { GraphQLSchema, execute, subscribe } from 'graphql';
import express, { RequestHandler } from 'express';
import { Logger } from 'winston';
import { fork as clusterFork, isMaster } from 'cluster';
import { cpus } from 'os';
import 'json-bigint-patch';
import { createServer } from 'http';
import { playground } from './playground';
import { graphqlHTTP } from 'express-graphql';
import { graphqlUploadExpress } from 'graphql-upload';
import { SubscriptionServer, OperationMessagePayload, ConnectionContext } from 'subscriptions-transport-ws';
import { MeshPubSub, YamlConfig } from '@graphql-mesh/types';
import cors from 'cors';
import { loadFromModuleExportExpression } from '@graphql-mesh/utils';
import { get } from 'lodash';

export async function serveMesh(
  logger: Logger,
  schema: GraphQLSchema,
  contextBuilder: (initialContextValue?: any) => Promise<Record<string, any>>,
  pubSub: MeshPubSub,
  { fork, exampleQuery, port = 4000, cors: corsConfig, handlers }: YamlConfig.ServeConfig = {}
): Promise<void> {
  const graphqlPath = '/graphql';
  if (isMaster && fork) {
    const forkNum = fork > 1 ? fork : cpus().length;
    for (let i = 0; i < forkNum; i++) {
      clusterFork();
    }
    logger.info(`🕸️ => Serving GraphQL Mesh GraphiQL: http://localhost:${port}${graphqlPath} in ${fork} forks`);
  } else {
    const app = express();
    app.set('trust proxy', 'loopback');
    const httpServer = createServer(app);

    if (corsConfig) {
      app.use(cors(corsConfig));
    }

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
        customFormatErrorFn: error => {
          return {
            extensions: error.extensions,
            locations: error.locations,
            message: error.message,
            name: error.name,
            nodes: error.nodes,
            originalError: {
              ...error?.originalError,
              name: error?.originalError?.name,
              message: error?.originalError?.message,
              stack: error?.originalError?.stack.split('\n'),
            },
            path: error.path,
            positions: error.positions,
            source: {
              body: error.source?.body?.split('\n'),
              name: error.source?.name,
              locationOffset: {
                line: error.source?.locationOffset?.line,
                column: error.source?.locationOffset?.column,
              },
            },
            stack: error.stack?.split('\n'),
            ...error,
          };
        },
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

    for (const handlerConfig of handlers) {
      if ('handler' in handlerConfig) {
        const handlerFn = await loadFromModuleExportExpression<RequestHandler>(handlerConfig.handler);
        app.use(handlerConfig.path, handlerFn);
      } else if ('pubSubTopic' in handlerConfig) {
        app.use(handlerConfig.path, req => {
          let payload = req.body;
          if (handlerConfig.payload) {
            payload = get(payload, handlerConfig.payload);
          }
          pubSub.publish(handlerConfig.pubSubTopic, payload);
        });
      }
    }

    httpServer.listen(port.toString(), () => {
      if (!fork) {
        logger.info(`🕸️ => Serving GraphQL Mesh Playground: http://localhost:${port}${graphqlPath}`);
      }
    });
  }
}
