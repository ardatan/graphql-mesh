/* eslint-disable import/no-nodejs-modules */
import cluster from 'cluster';
import { availableParallelism, platform, release } from 'os';
import { dirname, isAbsolute, join, relative } from 'path';
import { App, SSLApp } from 'uWebSockets.js';
import { createServeRuntime, UnifiedGraphConfig } from '@graphql-mesh/serve-runtime';
// eslint-disable-next-line import/no-extraneous-dependencies
import { DefaultLogger, registerTerminateHandler } from '@graphql-mesh/utils';
import { MeshServeCLIConfig } from './types';

interface RunServeCLIOpts {
  defaultConfigFileName?: string;
  defaultConfigFilePath?: string;
  productName?: string;
  defaultConfig?: MeshServeCLIConfig;
  processExit?: (exitCode: number) => void;
}

const defaultProcessExit = (exitCode: number) => process.exit(exitCode);

export async function runServeCLI({
  processExit = defaultProcessExit,
  defaultConfigFileName = 'mesh.config.ts',
  defaultConfigFilePath = process.cwd(),
  defaultConfig = {
    fusiongraph: './fusiongraph.graphql',
  },
  productName = 'Mesh',
}: RunServeCLIOpts = {}): Promise<void | never> {
  const prefix = cluster.worker?.id
    ? `🕸️  ${productName} Worker#${cluster.worker.id}`
    : `🕸️  ${productName}`;
  const workerLogger = new DefaultLogger(prefix);
  workerLogger.info(`Starting`);

  const meshServeCLIConfigFileName =
    process.env.MESH_SERVE_CONFIG_FILE_NAME || defaultConfigFileName;
  const meshServeCLIConfigFilePath =
    process.env.MESH_SERVE_CONFIG_FILE_PATH ||
    join(defaultConfigFilePath, meshServeCLIConfigFileName);

  const meshServeCLIConfigRelativePath = relative(process.cwd(), meshServeCLIConfigFilePath);

  workerLogger.info(`Loading configuration from ${meshServeCLIConfigRelativePath}`);
  const loadedConfig: { serveConfig: MeshServeCLIConfig } = await import(
    meshServeCLIConfigFilePath
  ).catch(e => {
    workerLogger.error(`Failed to load configuration from ${meshServeCLIConfigRelativePath}`, e);
    return processExit(1);
  });

  const meshServeCLIConfig = loadedConfig.serveConfig || defaultConfig;
  workerLogger.info(`Loaded configuration from ${meshServeCLIConfigRelativePath}`);

  let unifiedGraphPath: UnifiedGraphConfig;
  let spec: 'federation' | 'fusion';

  if ('fusiongraph' in meshServeCLIConfig) {
    unifiedGraphPath = meshServeCLIConfig.fusiongraph;
    spec = 'fusion';
  } else if ('supergraph' in meshServeCLIConfig) {
    unifiedGraphPath = meshServeCLIConfig.supergraph;
    spec = 'federation';
  } else if (!('http' in meshServeCLIConfig)) {
    unifiedGraphPath = './fusiongraph.graphql';
  }

  let loadingMessage: string;
  switch (spec) {
    case 'fusion':
      if (typeof unifiedGraphPath === 'string') {
        loadingMessage = `Loading Fusiongraph from ${unifiedGraphPath}`;
      } else {
        loadingMessage = `Loading Fusiongraph`;
      }
      break;
    case 'federation':
      if (typeof unifiedGraphPath === 'string') {
        loadingMessage = `Loading Supergraph from ${unifiedGraphPath}`;
      } else {
        loadingMessage = `Loading Supergraph`;
      }
      break;
    default:
      if (typeof unifiedGraphPath === 'string') {
        loadingMessage = `Loading schema from ${unifiedGraphPath}`;
      } else {
        loadingMessage = `Loading schema`;
      }
  }

  workerLogger.info(loadingMessage);

  const unifiedGraphName = spec === 'fusion' ? 'fusiongraph' : 'supergraph';

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

    if (typeof unifiedGraphPath === 'string' && !unifiedGraphPath.includes('://')) {
      const parcelWatcher$ = import('@parcel/watcher');
      parcelWatcher$
        .catch(() => {
          httpHandler.logger.warn(
            `If you want to enable hot reloading on ${unifiedGraphPath}, install "@parcel/watcher"`,
          );
        })
        .then(parcelWatcher => {
          if (parcelWatcher) {
            const absoluteUnifiedGraphPath: string = isAbsolute(unifiedGraphPath as string)
              ? (unifiedGraphPath as string)
              : join(process.cwd(), unifiedGraphPath as string);
            const unifiedGraphDir = dirname(absoluteUnifiedGraphPath);
            return parcelWatcher
              .subscribe(unifiedGraphDir, (err, events) => {
                if (err) {
                  workerLogger.error(err);
                  return;
                }
                if (events.some(event => event.path === absoluteUnifiedGraphPath)) {
                  workerLogger.info(`${unifiedGraphName} changed`);
                  if (forkNum > 1) {
                    for (const workerId in cluster.workers) {
                      cluster.workers[workerId].send('invalidateUnifiedGraph');
                    }
                  } else {
                    httpHandler.invalidateUnifiedGraph();
                  }
                }
              })
              .then(subscription => {
                registerTerminateHandler(eventName => {
                  workerLogger.info(
                    `Closing watcher for ${absoluteUnifiedGraphPath} for ${eventName}`,
                  );
                  return subscription.unsubscribe();
                });
              });
          }
          return null;
        })
        .catch(e => {
          workerLogger.error(`Failed to watch ${unifiedGraphPath}`, e);
        });
    }

    if (forkNum > 1) {
      workerLogger.info(`Forking ${forkNum} ${productName} Workers`);
      for (let i = 0; i < forkNum; i++) {
        workerLogger.info(`Forking ${productName} Worker #${i}`);
        const worker = cluster.fork();
        registerTerminateHandler(eventName => {
          workerLogger.info(`Closing ${productName} Worker #${i} for ${eventName}`);
          worker.kill(eventName);
          workerLogger.info(`Closed ${productName} Worker #${i} for ${eventName}`);
        });
        workerLogger.info(`Forked ${productName} Worker #${i}`);
      }
      workerLogger.info(`Forked ${forkNum} ${productName} Workers`);

      return;
    }
  }

  const port = meshServeCLIConfig.port || 4000;
  const host =
    meshServeCLIConfig.host ||
    platform() === 'win32' ||
    // is WSL?
    release().toLowerCase().includes('microsoft')
      ? '127.0.0.1'
      : '0.0.0.0';
  const httpHandler = createServeRuntime({
    logging: workerLogger,
    ...meshServeCLIConfig,
  });
  process.on('message', message => {
    if (message === 'invalidateUnifiedGraph') {
      workerLogger.info(`Invalidating ${unifiedGraphName}`);
      httpHandler.invalidateUnifiedGraph();
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
