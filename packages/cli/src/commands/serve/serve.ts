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
import { env, on as processOn } from 'process';
import { YamlConfig, Logger } from '@graphql-mesh/types';
import { Source, inspect } from '@graphql-tools/utils';

const { readFile } = fsPromises;

export interface ServeMeshOptions {
  baseDir: string;
  getBuiltMesh: () => Promise<MeshInstance>;
  logger: Logger;
  rawConfig: YamlConfig.Config;
  documents: Source[];
  argsPort?: number;
}

const terminateEvents = ['SIGINT', 'SIGTERM'];

function registerTerminateHandler(callback: (eventName: string) => void) {
  for (const eventName of terminateEvents) {
    processOn(eventName, () => callback(eventName));
  }
}

export async function serveMesh({ baseDir, argsPort, getBuiltMesh, logger, rawConfig, documents }: ServeMeshOptions) {
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
      const worker = clusterFork();
      registerTerminateHandler(eventName => worker.kill(eventName));
    }
    logger.info(`Serving GraphQL Mesh: ${serverUrl} in ${forkNum} forks`);
  } else {
    logger.info(`Generating Mesh schema...`);
    let readyFlag = false;
    const mesh$: Promise<MeshInstance> = getBuiltMesh()
      .then(mesh => {
        readyFlag = true;
        logger.info(`Serving GraphQL Mesh: ${serverUrl}`);
        registerTerminateHandler(eventName => {
          const eventLogger = logger.child(`${eventName}💀`);
          eventLogger.info(`Destroying GraphQL Mesh`);
          mesh.destroy();
        });
        return mesh;
      })
      .catch(e => handleFatalError(e, logger));
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

    registerTerminateHandler(eventName => {
      const eventLogger = logger.child(`${eventName}💀`);
      eventLogger.debug(`Stopping HTTP Server`);
      httpServer.close(error => {
        if (error) {
          eventLogger.debug(`HTTP Server couldn't be stopped: ${error.message}`);
        } else {
          eventLogger.debug(`HTTP Server has been stopped`);
        }
      });
    });

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

    registerTerminateHandler(eventName => {
      const eventLogger = logger.child(`${eventName}💀`);
      eventLogger.debug(`Stopping WebSocket Server`);
      wsServer.close(error => {
        if (error) {
          eventLogger.debug(`WebSocket Server couldn't be stopped: ${error.message}`);
        } else {
          eventLogger.debug(`WebSocket Server has been stopped`);
        }
      });
    });

    const { dispose: stopGraphQLWSServer } = useServer(
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
            if (!(key.toLowerCase() in request.headers)) {
              request.headers[key.toLowerCase()] = value;
            }
          }

          return request;
        },
      },
      wsServer
    );

    registerTerminateHandler(eventName => {
      const eventLogger = logger.child(`${eventName}💀`);
      eventLogger.debug(`Stopping GraphQL WS`);
      Promise.resolve()
        .then(() => stopGraphQLWSServer())
        .then(() => {
          eventLogger.debug(`GraphQL WS has been stopped`);
        })
        .catch(error => {
          eventLogger.debug(`GraphQL WS couldn't be stopped: ${error.message}`);
        });
    });

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
