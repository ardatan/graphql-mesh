/* eslint-disable import/no-nodejs-modules */

/* eslint-disable dot-notation */
import cluster from 'cluster';
import os from 'os';
import open from 'open';
import { process } from '@graphql-mesh/cross-helpers';
import { createMeshHTTPHandler } from '@graphql-mesh/http';
import type { ServeMeshOptions } from '@graphql-mesh/runtime';
import type { Logger } from '@graphql-mesh/types';
import type { GraphQLMeshCLIParams } from '../../index.js';
import { startNodeHttpServer } from './node-http.js';
import { startuWebSocketsServer } from './uWebsockets.js';

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
  {
    baseDir,
    argsPort,
    getBuiltMesh,
    logger,
    rawServeConfig = {},
    playgroundTitle,
    registerTerminateHandler,
  }: ServeMeshOptions,
  cliParams: GraphQLMeshCLIParams,
) {
  const {
    fork: configFork = process.env.NODE_ENV?.toLowerCase() === 'production',
    port: configPort,
    hostname = os.platform().toLowerCase() === 'win32' ||
    // is WSL?
    os.release().toLowerCase().includes('microsoft')
      ? '127.0.0.1'
      : '0.0.0.0',
    sslCredentials,
    endpoint: graphqlPath = '/graphql',
    browser = process.env.NODE_ENV?.toLowerCase() !== 'production',
  } = rawServeConfig;

  const port = portSelectorFn(
    [argsPort, parseInt(configPort?.toString()), parseInt(process.env.PORT)],
    logger,
  );

  let forkNum: number;

  const envFork = process.env.FORK;

  let defaultForkNum = 0;

  try {
    defaultForkNum = os.availableParallelism();
  } catch (e) {
    try {
      defaultForkNum = os.cpus().length;
    } catch (e) {
      // ignore
    }
  }

  if (envFork != null) {
    if (envFork === 'false' || envFork === '0') {
      forkNum = 0;
    } else if (envFork === 'true') {
      forkNum = defaultForkNum;
    } else {
      forkNum = parseInt(envFork);
    }
  } else if (configFork != null) {
    if (typeof configFork === 'boolean') {
      forkNum = configFork ? defaultForkNum : 0;
    } else {
      forkNum = configFork;
    }
  }

  const protocol = sslCredentials ? 'https' : 'http';
  const serverUrl = `${protocol}://${hostname}:${port}`;
  if (!playgroundTitle) {
    playgroundTitle = rawServeConfig?.playgroundTitle || cliParams.playgroundTitle;
  }
  if (!cluster.isWorker && forkNum > 1) {
    let mainProcessKilled = false;
    registerTerminateHandler(eventName => {
      mainProcessKilled = true;
    });
    for (let i = 0; i < forkNum; i++) {
      const worker = cluster.fork();
      registerTerminateHandler(eventName => worker.kill(eventName));
    }
    logger.info(`${cliParams.serveMessage}: ${serverUrl} in ${forkNum} forks`);
    cluster.on('exit', (worker, code, signal) => {
      if (!mainProcessKilled) {
        logger.child(`Worker ${worker.id}`).error(`died with ${signal || code}. Restarting...`);
        const newWorker = cluster.fork();
        registerTerminateHandler(eventName => newWorker.kill(eventName));
      }
    });
  } else {
    if (cluster.isWorker) {
      logger.addPrefix?.(`Worker ${cluster.worker?.id}`);
    }
    logger.info(`Starting GraphQL Mesh...`);

    logger.info(`${cliParams.serveMessage}: ${serverUrl}`);
    registerTerminateHandler(eventName => {
      const eventLogger = logger.child(`${eventName}  💀`);
      eventLogger.info(`Destroying GraphQL Mesh...`);
      getBuiltMesh()
        .then(mesh => mesh.destroy())
        .catch(e => eventLogger.error(e));
    });

    const meshHTTPHandler = createMeshHTTPHandler({
      baseDir,
      getBuiltMesh,
      rawServeConfig,
      playgroundTitle,
    });

    let uWebSocketsAvailable = false;
    try {
      await import('uWebSockets.js');
      uWebSocketsAvailable = true;
    } catch (err) {
      logger.warn(
        'uWebSockets.js is not available currently so the server will fallback to node:http.',
      );
    }

    const startServer = uWebSocketsAvailable ? startuWebSocketsServer : startNodeHttpServer;
    const { stop } = await startServer({
      meshHTTPHandler,
      getBuiltMesh,
      sslCredentials,
      graphqlPath,
      hostname,
      port,
    });

    registerTerminateHandler(async eventName => {
      const eventLogger = logger.child(`${eventName}  💀`);
      eventLogger.debug(`Stopping HTTP Server`);
      stop();
      eventLogger.debug(`HTTP Server has been stopped`);
    });
    if (browser) {
      open(
        serverUrl.replace('0.0.0.0', 'localhost'),
        typeof browser === 'string' ? { app: browser } : undefined,
      ).catch(() => {
        logger.warn(`Failed to open browser for ${serverUrl}`);
      });
    }
  }
  return null;
}
