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
import _ from 'lodash';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import { join } from 'path';
import { graphqlHandler } from './graphql-handler';

import { createServer as createHTTPSServer } from 'https';
import { promises as fsPromises } from 'fs';
import { MeshInstance } from '@graphql-mesh/runtime';
import { handleFatalError } from '../../handleFatalError';
import open from 'open';
import { useServer } from 'graphql-ws/lib/use/ws';
import { env } from 'process';
import { YamlConfig, Logger } from '@graphql-mesh/types';
import { Source } from '@graphql-tools/utils';
import { inspect } from 'util';

const { readFile } = fsPromises;

export interface ServeMeshOptions {
  baseDir: string;
  getBuiltMesh: () => Promise<MeshInstance>;
  logger: Logger;
  rawConfig: YamlConfig.Config;
  documents: Source[];
  argsPort?: number;
}

export async function serveMesh({ baseDir, argsPort, getBuiltMesh, logger, rawConfig, documents }: ServeMeshOptions) {
  logger.info(`Generating Mesh schema...`);
  let readyFlag = false;

  const mesh$ = getBuiltMesh()
    .then(mesh => {
      readyFlag = true;
      if (!fork) {
        logger.info(`🕸️ => Serving GraphQL Mesh: ${serverUrl}`);
      }
      return mesh;
    })
    .catch(e => handleFatalError(e, logger));
  const {
    fork,
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
  } = rawConfig.serve || {};
  const port = argsPort || parseInt(env.PORT) || configPort || 4000;

  const protocol = sslCredentials ? 'https' : 'http';
  const serverUrl = `${protocol}://${hostname}:${port}`;
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
        schema: () => mesh$.then(({ schema }) => schema),
        execute: args =>
          mesh$.then(({ execute }) => execute(args.document, args.variableValues, args.contextValue, args.rootValue)),
        subscribe: args =>
          mesh$.then(({ subscribe }) =>
            subscribe(args.document, args.variableValues, args.contextValue, args.rootValue)
          ),
        context: async ({ connectionParams, extra: { request } }) => {
          // spread connectionParams.headers to upgrade request headers.
          // we completely ignore the root connectionParams because
          // [@graphql-tools/url-loader adds the headers inside the "headers" field](https://github.com/ardatan/graphql-tools/blob/9a13357c4be98038c645f6efb26f0584828177cf/packages/loaders/url/src/index.ts#L597)
          for (const [key, value] of Object.entries(connectionParams.headers ?? {})) {
            // dont overwrite existing upgrade headers due to security reasons
            if (!(key in request.headers)) {
              request.headers[key.toLowerCase()] = value;
            }
          }

          const { contextBuilder } = await mesh$;
          return contextBuilder(request);
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
        let handlerFn: any;
        const handlerLogger = logger.child(handlerConfig.path);
        if ('handler' in handlerConfig) {
          handlerFn = await loadFromModuleExportExpression<RequestHandler>(handlerConfig.handler, {
            cwd: baseDir,
            defaultExportName: 'default',
            importFn: m => import(m),
          });
        } else if ('pubsubTopic' in handlerConfig) {
          handlerFn = (req: any, res: any) => {
            let payload = req.body;
            handlerLogger.debug(`Payload received; ${inspect(payload)}`);
            if (handlerConfig.payload) {
              payload = _.get(payload, handlerConfig.payload);
              handlerLogger.debug(`Extracting ${handlerConfig.payload}; ${inspect(payload)}`);
            }
            req['pubsub'].publish(handlerConfig.pubsubTopic, payload);
            handlerLogger.debug(`Payload sent to ${handlerConfig.pubsubTopic}`);
            res.end();
          };
        }
        app[handlerConfig.method?.toLowerCase() || 'use'](handlerConfig.path, handlerFn);
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

    if (typeof playground !== 'undefined' ? playground : env.NODE_ENV?.toLowerCase() !== 'production') {
      const playgroundMiddleware = playgroundMiddlewareFactory({
        baseDir,
        documents,
        graphqlPath,
        logger: logger,
      });
      if (!staticFiles) {
        app.get('/', playgroundMiddleware);
      }
      app.get(graphqlPath, playgroundMiddleware);
    }

    httpServer
      .listen(parseInt(port.toString()), hostname, () => {
        const shouldntOpenBrowser = env.NODE_ENV?.toLowerCase() === 'production' || browser === false;
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
      logger: logger,
    }));
  }
  return null;
}
