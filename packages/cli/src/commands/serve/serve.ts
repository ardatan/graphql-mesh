/* eslint-disable dot-notation */
import express, { RequestHandler } from 'express';
import { fork as clusterFork, isMaster } from 'cluster';
import { cpus } from 'os';
import 'json-bigint-patch';
import { createServer as createHTTPServer, Server } from 'http';
import { playgroundMiddlewareFactory } from './playground';
import { graphqlUploadExpress } from 'graphql-upload';
import ws from 'ws';
import cors from 'cors';
import { loadFromModuleExportExpression, pathExists } from '@graphql-mesh/utils';
import { get } from 'lodash';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import { join } from 'path';
import { graphqlHandler } from './graphql-handler';

import { createServer as createHTTPSServer } from 'https';
import { promises as fsPromises } from 'fs';
import { findAndParseConfig } from '@graphql-mesh/config';
import { getMesh } from '@graphql-mesh/runtime';
import { logger } from '../../logger';
import { handleFatalError } from '../../handleFatalError';
import { spinner } from '../../spinner';
import open from 'open';

const { readFile } = fsPromises;

export async function serveMesh(baseDir: string, argsPort?: number) {
  spinner.start('Generating Mesh schema...');
  let readyFlag = false;

  const meshConfig = await findAndParseConfig({
    dir: baseDir,
  });
  const mesh$ = getMesh(meshConfig)
    .then(mesh => {
      readyFlag = true;
      if (spinner.isSpinning) {
        if (!fork) {
          spinner.succeed(`Serving GraphQL Mesh: ${serverUrl}`);
        }
      }
      return mesh;
    })
    .catch(handleFatalError);
  const {
    fork,
    exampleQuery,
    port: configPort,
    hostname = 'localhost',
    cors: corsConfig,
    handlers,
    staticFiles,
    playground,
    upload: { maxFileSize = 10000000, maxFiles = 10 } = {},
    maxRequestBodySize = '100kb',
    sslCredentials,
    endpoint: graphqlPath = '/graphql',
    browser,
  } = meshConfig.config.serve || {};
  const port = argsPort || parseInt(process.env.PORT) || configPort || 4000;

  const protocol = sslCredentials ? 'https' : 'http';
  const serverUrl = `${protocol}://${hostname}:${port}`;
  const { useServer }: typeof import('graphql-ws/lib/use/ws') = require('graphql-ws/lib/use/ws');
  if (isMaster && fork) {
    const forkNum = fork > 1 ? fork : cpus().length;
    for (let i = 0; i < forkNum; i++) {
      clusterFork();
    }
    logger.info(`Serving GraphQL Mesh: ${serverUrl} in ${forkNum} forks`);
  } else {
    const app = express();
    app.set('trust proxy', 'loopback');
    let httpServer: Server;

    if (sslCredentials) {
      const [key, cert] = await Promise.all([
        readFile(sslCredentials.key, 'utf-8'),
        readFile(sslCredentials.cert, 'utf-8'),
      ]);
      httpServer = createHTTPSServer({ key, cert }, app);
    } else {
      httpServer = createHTTPServer(app);
    }

    if (corsConfig) {
      app.use(cors(corsConfig));
    }

    app.use(
      bodyParser.json({
        limit: maxRequestBodySize,
      })
    );
    app.use(cookieParser());

    const wsServer = new ws.Server({
      path: graphqlPath,
      server: httpServer,
    });

    useServer(
      {
        execute: args =>
          mesh$.then(({ execute }) => execute(args.document, args.variableValues, args.contextValue, args.rootValue)),
        subscribe: args =>
          mesh$.then(({ subscribe }) =>
            subscribe(args.document, args.variableValues, args.contextValue, args.rootValue)
          ),
        context: async ctx => {
          const { contextBuilder } = await mesh$;
          return contextBuilder(ctx.extra.request);
        },
      },
      wsServer
    );

    const pubSubHandler: RequestHandler = (req, _res, next) => {
      Promise.resolve().then(async () => {
        const { pubsub } = await mesh$;
        req['pubsub'] = pubsub;
        next();
      });
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
            req['pubsub'].publish(handlerConfig.pubsubTopic, payload);
            res.end();
          });
        }
      }) || []
    );

    app.get('/healthcheck', (_req, res) => res.sendStatus(200));
    app.get('/readiness', (_req, res) => res.sendStatus(readyFlag ? 200 : 500));

    if (staticFiles) {
      app.use(express.static(staticFiles));
      const indexPath = join(baseDir, staticFiles, 'index.html');
      if (await pathExists(indexPath)) {
        app.get('/', (_req, res) => res.sendFile(indexPath));
      }
    }

    app.use(graphqlPath, graphqlUploadExpress({ maxFileSize, maxFiles }), graphqlHandler(mesh$));

    if (typeof playground !== 'undefined' ? playground : process.env.NODE_ENV?.toLowerCase() !== 'production') {
      const playgroundMiddleware = playgroundMiddlewareFactory({ baseDir, exampleQuery, hostname, port, graphqlPath });
      if (!staticFiles) {
        app.get('/', playgroundMiddleware);
      }
      app.get(graphqlPath, playgroundMiddleware);
    }

    httpServer
      .listen(parseInt(port.toString()), hostname, () => {
        const shouldntOpenBrowser = process.env.NODE_ENV?.toLowerCase() === 'production' || browser === false;
        if (!shouldntOpenBrowser) {
          open(serverUrl, typeof browser === 'string' ? { app: browser } : undefined).catch(() => {});
        }
      })
      .on('error', handleFatalError);

    return mesh$.then(mesh => ({
      mesh,
      httpServer,
      app,
      readyFlag,
      logger,
    }));
  }
  return null;
}
