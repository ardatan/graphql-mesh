/* eslint-disable dot-notation */
import { GraphQLSchema, execute, subscribe } from 'graphql';
import express, { RequestHandler } from 'express';
import { Logger } from 'winston';
import { fork as clusterFork, isMaster } from 'cluster';
import { cpus } from 'os';
import 'json-bigint-patch';
import { createServer } from 'http';
import { playground } from './playground';
import { graphqlUploadExpress } from 'graphql-upload';
import ws from 'ws';
import { MeshPubSub, YamlConfig } from '@graphql-mesh/types';
import cors from 'cors';
import { loadFromModuleExportExpression } from '@graphql-mesh/utils';
import { get } from 'lodash';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import { join } from 'path';
import { cwd } from 'process';
import { pathExists } from 'fs-extra';
import { graphqlHandler } from './graphql-handler';

export async function serveMesh(
  logger: Logger,
  schema: GraphQLSchema,
  contextBuilder: (initialContextValue?: any) => Promise<Record<string, any>>,
  pubsub: MeshPubSub,
  { fork, exampleQuery, port, cors: corsConfig, handlers, staticFiles }: YamlConfig.ServeConfig = {}
): Promise<void> {
  const { useServer }: typeof import('graphql-ws/lib/use/ws') = require('graphql-ws/lib/use/ws');
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
      graphqlHandler(schema, contextBuilder)
    );

    const wsServer = new ws.Server({
      path: graphqlPath,
      server: httpServer,
    });

    useServer(
      {
        schema,
        execute,
        subscribe,
        context: ctx => contextBuilder(ctx.extra.request),
      },
      wsServer
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
      app.use(express.static(join(__dirname, './public')));
    }

    httpServer.listen(port.toString(), () => {
      if (!fork) {
        logger.info(`🕸️ => Serving GraphQL Mesh: http://localhost:${port}`);
      }
    });
  }
}
