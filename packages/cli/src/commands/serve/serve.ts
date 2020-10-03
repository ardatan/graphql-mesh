/* eslint-disable dot-notation */
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
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import { join } from 'path';
import { cwd } from 'process';
import { pathExists } from 'fs-extra';

export async function serveMesh(
  logger: Logger,
  schema: GraphQLSchema,
  contextBuilder: (initialContextValue?: any) => Promise<Record<string, any>>,
  pubsub: MeshPubSub,
  { fork, exampleQuery, port, cors: corsConfig, handlers, staticFiles }: YamlConfig.ServeConfig = {}
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

    app.use(bodyParser.json());
    app.use(cookieParser());

    if (staticFiles) {
      app.use(express.static(staticFiles));
      const indexPath = join(cwd(), staticFiles, 'index.html');
      if (await pathExists(indexPath)) {
        app.get('/', (_req, res) => res.sendFile(indexPath));
      }
    }

    app.post(
      graphqlPath,
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

    const pubSubHandler: RequestHandler = (req, _res, next) => {
      req['pubsub'] = pubsub;
      next();
    };
    app.use(pubSubHandler);

    const registeredPaths = new Set<string>();
    await Promise.all(
      handlers?.map(async handlerConfig => {
        registeredPaths.add(handlerConfig.path);
        if ('handler' in handlerConfig) {
          const handlerFn = await loadFromModuleExportExpression<RequestHandler>(handlerConfig.handler);
          app[handlerConfig.method.toLowerCase() || 'use'](handlerConfig.path, handlerFn);
        } else if ('pubsubTopic' in handlerConfig) {
          app.use(handlerConfig.path, (req, res) => {
            let payload = req.body;
            if (handlerConfig.payload) {
              payload = get(payload, handlerConfig.payload);
            }
            pubsub.publish(handlerConfig.pubsubTopic, payload);
            res.end();
          });
        }
      }) || []
    );

    if (process.env.NODE_ENV?.toLowerCase() !== 'production') {
      const playgroundMiddleware = playground(exampleQuery, graphqlPath);
      if (!staticFiles) {
        app.get('/', playgroundMiddleware);
      }
      app.get(graphqlPath, playgroundMiddleware);
    }

    httpServer.listen(port.toString(), () => {
      if (!fork) {
        logger.info(`🕸️ => Serving GraphQL Mesh: http://localhost:${port}`);
      }
    });
  }
}
