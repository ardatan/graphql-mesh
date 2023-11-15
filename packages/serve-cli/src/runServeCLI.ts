/* eslint-disable import/no-nodejs-modules */
import cluster from 'cluster';
import { availableParallelism } from 'os';
import { dirname, isAbsolute, join, relative } from 'path';
import { GraphQLSchema } from 'graphql';
import { App, SSLApp } from 'uWebSockets.js';
import { createServeRuntime } from '@graphql-mesh/serve-runtime';
// eslint-disable-next-line import/no-extraneous-dependencies
import { DefaultLogger } from '@graphql-mesh/utils';
import { GitLoader } from '@graphql-tools/git-loader';
import { GithubLoader } from '@graphql-tools/github-loader';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { loadSchema } from '@graphql-tools/load';
import { UrlLoader } from '@graphql-tools/url-loader';
import { MeshServeCLIConfig } from './types';

export async function runServeCLI(
  processExit = (exitCode: number) => process.exit(exitCode),
): Promise<void | never> {
  const prefix = cluster.worker?.id ? `🕸️  Mesh Worker#${cluster.worker.id}` : `🕸️  Mesh`;
  const workerLogger = new DefaultLogger(prefix);
  workerLogger.info(`Starting`);

  const meshServeCLIConfigFileName = process.env.MESH_SERVE_CONFIG_FILE_NAME || 'mesh.config.ts';
  const meshServeCLIConfigFilePath =
    process.env.MESH_SERVE_CONFIG_FILE_PATH || join(process.cwd(), meshServeCLIConfigFileName);

  const meshServeCLIConfigRelativePath = relative(process.cwd(), meshServeCLIConfigFilePath);

  workerLogger.info(`Loading configuration from ${meshServeCLIConfigRelativePath}`);
  const loadedConfig: { serveConfig: MeshServeCLIConfig } = await import(
    meshServeCLIConfigFilePath
  ).catch(e => {
    workerLogger.error(`Failed to load configuration from ${meshServeCLIConfigRelativePath}`, e);
    return processExit(1);
  });

  const meshServeCLIConfig = loadedConfig.serveConfig || {
    supergraph: './supergraph.graphql',
  };
  workerLogger.info(`Loaded configuration from ${meshServeCLIConfigRelativePath}`);

  const supergraphPath = !('http' in meshServeCLIConfig)
    ? 'supergraph' in meshServeCLIConfig
      ? meshServeCLIConfig.supergraph
      : './supergraph.graphql'
    : undefined;

  if (cluster.isPrimary) {
    let forkNum: number;
    if (!process.env.FORK || process.env.FORK === 'true') {
      forkNum = process.env.NODE_ENV === 'production' ? availableParallelism() : 1;
    } else if (
      process.env.FORK === 'false' ||
      process.env.FORK === '0' ||
      process.env.FORK === '1'
    ) {
      forkNum = 1;
    } else if (!isNaN(parseInt(process.env.FORK))) {
      forkNum = parseInt(process.env.FORK);
    }

    if (typeof supergraphPath === 'string' && !supergraphPath.includes('://')) {
      const parcelWatcher$ = import('@parcel/watcher');
      parcelWatcher$
        .catch(e => {
          httpHandler.logger.error(
            `If you want to enable hot reloading on ${supergraphPath}, install "@parcel/watcher"`,
            e,
          );
        })
        .then(parcelWatcher => {
          if (parcelWatcher) {
            const absoluteSupergraphPath = isAbsolute(supergraphPath)
              ? supergraphPath
              : join(process.cwd(), supergraphPath);
            const supergraphDir = dirname(absoluteSupergraphPath);
            return parcelWatcher
              .subscribe(supergraphDir, (err, events) => {
                if (err) {
                  workerLogger.error(err);
                  return;
                }
                if (events.some(event => event.path === absoluteSupergraphPath)) {
                  workerLogger.info(`Supergraph changed`);
                  if (forkNum > 1) {
                    for (const workerId in cluster.workers) {
                      cluster.workers[workerId].send('invalidateSupergraph');
                    }
                  } else {
                    httpHandler.invalidateSupergraph();
                  }
                }
              })
              .then(subscription => {
                registerTerminateHandler(eventName => {
                  workerLogger.info(
                    `Closing watcher for ${absoluteSupergraphPath} for ${eventName}`,
                  );
                  return subscription.unsubscribe();
                });
              });
          }
          return null;
        })
        .catch(e => {
          workerLogger.error(`Failed to watch ${supergraphPath}`, e);
        });
    }

    if (forkNum > 1) {
      workerLogger.info(`Forking ${forkNum} Mesh Workers`);
      for (let i = 0; i < forkNum; i++) {
        workerLogger.info(`Forking Mesh Worker #${i}`);
        const worker = cluster.fork();
        registerTerminateHandler(eventName => {
          workerLogger.info(`Closing Mesh Worker #${i} for ${eventName}`);
          worker.kill(eventName);
          workerLogger.info(`Closed Mesh Worker #${i} for ${eventName}`);
        });
        workerLogger.info(`Forked Mesh Worker #${i}`);
      }
      workerLogger.info(`Forked ${forkNum} Mesh Workers`);

      return;
    }
  }

  const port = meshServeCLIConfig.port || 4000;
  const host = meshServeCLIConfig.host || 'localhost';
  const httpHandler = createServeRuntime({
    logging: workerLogger,
    ...meshServeCLIConfig,
    supergraph(): Promise<GraphQLSchema> {
      workerLogger.info(`Loading Supergraph from ${supergraphPath}`);
      return loadSchema(supergraphPath, {
        loaders: [new GraphQLFileLoader(), new UrlLoader(), new GithubLoader(), new GitLoader()],
        assumeValid: true,
        assumeValidSDL: true,
      })
        .then(supergraph => {
          workerLogger.info(`Loaded Supergraph from ${supergraphPath}`);
          return supergraph;
        })
        .catch(e => {
          workerLogger.error(`Failed to load Supergraph from ${supergraphPath}`, e);
          throw e;
        });
    },
  });
  process.on('message', message => {
    if (message === 'invalidateSupergraph') {
      workerLogger.info(`Invalidating Supergraph`);
      httpHandler.invalidateSupergraph();
    }
  });
  const app = meshServeCLIConfig.sslCredentials ? SSLApp(meshServeCLIConfig.sslCredentials) : App();
  const protocol = meshServeCLIConfig.sslCredentials ? 'https' : 'http';
  app.any('/*', httpHandler);
  workerLogger.info(`Starting server on ${protocol}://${host}:${port}`);
  app.listen(host, port, function listenCallback(listenSocket) {
    if (listenSocket) {
      workerLogger.info(`Started server on ${protocol}://${host}:${port}`);
      registerTerminateHandler(eventName => {
        workerLogger.info(`Closing ${protocol}://${host}:${port} for ${eventName}`);
        app.close();
      });
    } else {
      workerLogger.error(`Failed to start server on ${protocol}://${host}:${port}`);
      processExit(1);
    }
  });
}

const terminateEvents = ['SIGINT', 'SIGTERM'] as const;
type TerminateEvents = (typeof terminateEvents)[number];
type TerminateHandler = (eventName: TerminateEvents) => void;
const terminateHandlers = new Set<TerminateHandler>();
for (const eventName of terminateEvents) {
  process.once(eventName, () => {
    for (const handler of terminateHandlers) {
      handler(eventName);
      terminateHandlers.delete(handler);
    }
  });
}

function registerTerminateHandler(callback: TerminateHandler) {
  terminateHandlers.add(callback);
  return () => {
    terminateHandlers.delete(callback);
  };
}
