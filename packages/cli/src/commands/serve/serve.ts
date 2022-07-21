/* eslint-disable import/no-nodejs-modules */
/* eslint-disable dot-notation */
import express from 'express';
import cluster from 'cluster';
import { cpus, platform, release } from 'os';
import 'json-bigint-patch';
import { createServer as createHTTPServer, Server } from 'http';
import ws from 'ws';
import cors from 'cors';
import { pathExists } from '@graphql-mesh/utils';
import cookieParser from 'cookie-parser';
import { path, fs, process } from '@graphql-mesh/cross-helpers';
import { graphqlHandler } from './graphql-handler';

import { createServer as createHTTPSServer } from 'https';
import { MeshInstance, ServeMeshOptions } from '@graphql-mesh/runtime';
import { handleFatalError } from '../../handleFatalError';
import open from 'open';
import { useServer } from 'graphql-ws/lib/use/ws';
import dnscache from 'dnscache';
import { GraphQLMeshCLIParams } from '../..';
import type { Logger } from '@graphql-mesh/types';

const terminateEvents = ['SIGINT', 'SIGTERM'];

function registerTerminateHandler(callback: (eventName: string) => void) {
  for (const eventName of terminateEvents) {
    process.on(eventName, () => callback(eventName));
  }
}

function portSelectorFn(sources: [number, number, number], logger: Logger) {
  const port = sources.find(source => Boolean(source)) || 4000;
  if (sources.filter(source => Boolean(source)).length > 1) {
    const activeSources: Array<string> = [];
    if (sources[0]) {
      activeSources.push('CLI');
    }
    if (sources[1]) {
      activeSources.push('serve configuration');
    }
    if (sources[2]) {
      activeSources.push('environment variable');
    }
    logger.warn(`Multiple ports specified (${activeSources.join(', ')}), using ${port}`);
  }

  return port;
}

export async function serveMesh(
  { baseDir, argsPort, getBuiltMesh, logger, rawServeConfig = {}, playgroundTitle }: ServeMeshOptions,
  cliParams: GraphQLMeshCLIParams
) {
  const {
    fork,
    port: configPort,
    hostname = platform() === 'win32' ||
    // is WSL?
    release().toLowerCase().includes('microsoft')
      ? '127.0.0.1'
      : '0.0.0.0',
    cors: corsConfig,
    staticFiles,
    playground: playgroundEnabled = process.env.NODE_ENV !== 'production',
    sslCredentials,
    endpoint: graphqlPath = '/graphql',
    browser,
    trustProxy = 'loopback',
  } = rawServeConfig;

  const port = portSelectorFn([argsPort, parseInt(configPort.toString()), parseInt(process.env.PORT)], logger);

  const protocol = sslCredentials ? 'https' : 'http';
  const serverUrl = `${protocol}://${hostname}:${port}`;
  if (!playgroundTitle) {
    playgroundTitle = rawServeConfig?.playgroundTitle || cliParams.playgroundTitle;
  }
  if (!cluster.isWorker && Boolean(fork)) {
    const forkNum = fork > 0 && typeof fork === 'number' ? fork : cpus().length;
    for (let i = 0; i < forkNum; i++) {
      const worker = cluster.fork();
      registerTerminateHandler(eventName => worker.kill(eventName));
    }
    logger.info(`${cliParams.serveMessage}: ${serverUrl} in ${forkNum} forks`);
  } else {
    logger.info(`Generating the unified schema...`);
    let readyFlag = false;
    const mesh$: Promise<MeshInstance> = getBuiltMesh()
      .then(mesh => {
        readyFlag = true;
        dnscache({
          enable: true,
          cache: function CacheCtor({ ttl }: { ttl: number }) {
            return {
              get: (key: string, callback: CallableFunction) =>
                mesh.cache
                  .get(key)
                  .then(value => callback(null, value))
                  .catch(e => callback(e)),
              set: (key: string, value: string, callback: CallableFunction) =>
                mesh.cache
                  .set(key, value, { ttl })
                  .then(() => callback())
                  .catch(e => callback(e)),
            };
          },
        });
        logger.info(`${cliParams.serveMessage}: ${serverUrl}`);
        registerTerminateHandler(eventName => {
          const eventLogger = logger.child(`${eventName}  💀`);
          eventLogger.info(`Destroying the server`);
          mesh.destroy();
        });
        return mesh;
      })
      .catch(e => handleFatalError(e, logger));
    const app = express();
    app.set('trust proxy', trustProxy);
    let httpServer: Server;

    if (sslCredentials) {
      const [key, cert] = await Promise.all([
        fs.promises.readFile(sslCredentials.key, 'utf-8'),
        fs.promises.readFile(sslCredentials.cert, 'utf-8'),
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
          eventLogger.debug(`HTTP Server couldn't be stopped: `, error);
        } else {
          eventLogger.debug(`HTTP Server has been stopped`);
        }
      });
    });

    if (corsConfig) {
      app.use(cors(corsConfig));
    }

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
          eventLogger.debug(`WebSocket Server couldn't be stopped: `, error);
        } else {
          eventLogger.debug(`WebSocket Server has been stopped`);
        }
      });
    });

    const { dispose: stopGraphQLWSServer } = useServer(
      {
        onSubscribe: async ({ connectionParams, extra: { request } }, msg) => {
          // spread connectionParams.headers to upgrade request headers.
          // we completely ignore the root connectionParams because
          // [@graphql-tools/url-loader adds the headers inside the "headers" field](https://github.com/ardatan/graphql-tools/blob/9a13357c4be98038c645f6efb26f0584828177cf/packages/loaders/url/src/index.ts#L597)
          for (const [key, value] of Object.entries(connectionParams.headers ?? {})) {
            // dont overwrite existing upgrade headers due to security reasons
            if (!(key.toLowerCase() in request.headers)) {
              request.headers[key.toLowerCase()] = value;
            }
          }
          const { getEnveloped } = await mesh$;
          const { schema, execute, subscribe, contextFactory, parse, validate } = getEnveloped(request);

          const args = {
            schema,
            operationName: msg.payload.operationName,
            document: parse(msg.payload.query),
            variableValues: msg.payload.variables,
            contextValue: await contextFactory(),
            execute,
            subscribe,
          };

          const errors = validate(args.schema, args.document);
          if (errors.length) return errors;

          return args;
        },
        execute: (args: any) => args.execute(args),
        subscribe: (args: any) => args.subscribe(args),
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
          eventLogger.debug(`GraphQL WS couldn't be stopped: `, error);
        });
    });

    app.get('/healthcheck', (_req, res) => res.sendStatus(200));
    app.get('/readiness', (_req, res) => res.sendStatus(readyFlag ? 200 : 500));

    if (staticFiles) {
      app.use(express.static(staticFiles));
      const indexPath = path.join(baseDir, staticFiles, 'index.html');
      if (await pathExists(indexPath)) {
        app.get('/', (_req, res) => res.sendFile(indexPath));
      }
    }

    app.use(graphqlPath, graphqlHandler(mesh$, playgroundTitle, playgroundEnabled));

    app.get('/', (req, res, next) => {
      if (staticFiles) {
        next();
      } else {
        res.redirect(graphqlPath);
      }
    });

    httpServer
      .listen(port, hostname, () => {
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
