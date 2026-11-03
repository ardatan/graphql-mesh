/* eslint-disable import/no-nodejs-modules */

import cluster from 'cluster';
import os from 'os';
import open from 'open';
import { type Logger } from '@graphql-hive/logger';
import { createMeshHTTPHandler, resolvePlaygroundConfig } from '@graphql-mesh/http';
import type { ServeMeshOptions } from '@graphql-mesh/runtime';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';
import type { GraphQLMeshCLIParams } from '../../index.js';
import { getMaxConcurrency } from './getMaxConcurency.js';
import { startNodeHttpServer } from './node-http.js';

type RenderGraphiQL = (options?: any) => string | Promise<string>;

function isModuleNotFoundError(error: unknown): boolean {
  const err = error as { code?: string; message?: string };
  return (
    err?.code === 'ERR_MODULE_NOT_FOUND' ||
    err?.code === 'MODULE_NOT_FOUND' ||
    (typeof err?.message === 'string' &&
      err.message.includes("Cannot find package '@graphql-yoga/render-graphiql'"))
  );
}

async function loadOfflineRenderGraphiQL(): Promise<RenderGraphiQL> {
  try {
    const { renderGraphiQL } = await import('@graphql-yoga/render-graphiql');
    return renderGraphiQL;
  } catch (error) {
    if (isModuleNotFoundError(error)) {
      throw new Error(
        'serve.playground.offline requires `@graphql-yoga/render-graphiql`. Install it as a direct dependency of this project.',
      );
    }
    throw error;
  }
}

function portSelectorFn(sources: [number, number, number], log: Logger) {
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
    log.warn(`Multiple ports specified (${activeSources.join(', ')}), using ${port}`);
  }

  return port;
}

export async function serveMesh(
  {
    baseDir,
    argsPort,
    getBuiltMesh,
    log,
    rawServeConfig = {},
    playgroundTitle,
    registerTerminateHandler,
  }: ServeMeshOptions,
  cliParams: GraphQLMeshCLIParams,
) {
  const {
    fork: configFork = globalThis.process?.env?.NODE_ENV?.toLowerCase() === 'production',
    port: configPort,
    hostname = os.platform().toLowerCase() === 'win32' ||
    // is WSL?
    os.release().toLowerCase().includes('microsoft')
      ? '127.0.0.1'
      : '0.0.0.0',
    sslCredentials,
    endpoint: graphqlPath = '/graphql',
    browser = globalThis.process?.env?.NODE_ENV?.toLowerCase() !== 'production',
  } = rawServeConfig;

  const port = portSelectorFn(
    [argsPort, parseInt(configPort?.toString()), parseInt(globalThis.process?.env?.PORT)],
    log,
  );

  let forkNum: number;

  const envFork = globalThis.process?.env?.FORK;

  let defaultForkNum = 0;

  defaultForkNum = getMaxConcurrency();

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
  const playgroundOffline = resolvePlaygroundConfig(rawServeConfig.playground, false).offline;
  let renderGraphiQL: RenderGraphiQL | undefined;
  if (playgroundOffline) {
    renderGraphiQL = await loadOfflineRenderGraphiQL();
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
    log.info(`${cliParams.serveMessage}: ${serverUrl} in ${forkNum} forks`);
    let diedWorkers = 0;
    cluster.on('exit', (worker, code, signal) => {
      if (!mainProcessKilled) {
        log.child({ worker: worker.id }).error(`died with ${signal || code}. Restarting...`);
        diedWorkers++;
        if (diedWorkers === forkNum) {
          log.error('All workers died. Exiting...');
          globalThis.process?.exit(1);
        } else {
          setTimeout(() => {
            const newWorker = cluster.fork();
            registerTerminateHandler(eventName => newWorker.kill(eventName));
          }, 1000);
        }
      }
    });
  } else {
    if (cluster.isWorker) {
      log = log.child({
        worker: cluster.worker.id,
      });
    }
    log.info(`Starting GraphQL Mesh...`);

    log.info(`${cliParams.serveMessage}: ${serverUrl}`);
    registerTerminateHandler(eventName => {
      const eventLogger = log.child({ terminateEvent: eventName });
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
      ...(renderGraphiQL ? { renderGraphiQL } : {}),
    });

    const { stop } = await startNodeHttpServer({
      meshHTTPHandler,
      getBuiltMesh,
      sslCredentials,
      graphqlPath,
      hostname,
      port,
    });

    registerTerminateHandler(eventName => {
      const eventLogger = log.child({ terminateEvent: eventName });
      eventLogger.debug(`Stopping HTTP Server`);
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      handleMaybePromise(
        stop,
        () => {
          eventLogger.debug(`HTTP Server has been stopped`);
        },
        () => {
          eventLogger.error(`Failed to stop HTTP Server`);
        },
      );
    });
    if (browser) {
      open(
        serverUrl.replace('0.0.0.0', 'localhost'),
        typeof browser === 'string' ? { app: browser } : undefined,
      ).catch(() => {
        log.warn(`Failed to open browser for ${serverUrl}`);
      });
    }
  }
  return null;
}
