/* eslint-disable import/no-nodejs-modules */

/* eslint-disable dot-notation */
import cluster from 'cluster';
import os from 'os';
import dnscache from 'dnscache';
import { execute, ExecutionArgs, subscribe } from 'graphql';
import { makeBehavior } from 'graphql-ws/lib/use/uWebSockets';
import open from 'open';
import type { TemplatedApp } from 'uWebSockets.js';
import { process } from '@graphql-mesh/cross-helpers';
import { createMeshHTTPHandler } from '@graphql-mesh/http';
import { MeshInstance, ServeMeshOptions } from '@graphql-mesh/runtime';
import type { Logger } from '@graphql-mesh/types';
import { handleFatalError } from '../../handleFatalError.js';
import { GraphQLMeshCLIParams } from '../../index.js';

const terminateEvents = ['SIGINT', 'SIGTERM'];

function registerTerminateHandler(callback: (eventName: string) => void) {
  for (const eventName of terminateEvents) {
    process.once(eventName, () => callback(eventName));
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
  {
    baseDir,
    argsPort,
    getBuiltMesh,
    logger,
    rawServeConfig = {},
    playgroundTitle,
  }: ServeMeshOptions,
  cliParams: GraphQLMeshCLIParams,
) {
  const {
    fork: configFork = process.env.NODE_ENV?.toLowerCase() === 'production',
    port: configPort,
    hostname = os.platform() === 'win32' ||
    // is WSL?
    os.release().toLowerCase().includes('microsoft')
      ? '127.0.0.1'
      : '0.0.0.0',
    sslCredentials,
    endpoint: graphqlPath = '/graphql',
    browser,
    // TODO
    // trustProxy = 'loopback',
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
  if (!cluster.isWorker && forkNum > 0) {
    for (let i = 0; i < forkNum; i++) {
      const worker = cluster.fork();
      registerTerminateHandler(eventName => worker.kill(eventName));
    }
    logger.info(`${cliParams.serveMessage}: ${serverUrl} in ${forkNum} forks`);
  } else {
    if (cluster.isWorker) {
      logger = logger.child(`Worker ${cluster.worker.id}`);
    }
    logger.info(`Starting GraphQL Mesh...`);

    const mesh$: Promise<MeshInstance> = getBuiltMesh()
      .then(async mesh => {
        if (mesh.schema.getType('BigInt')) {
          await import('json-bigint-patch');
        }
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
          eventLogger.info(`Destroying GraphQL Mesh...`);
          mesh.destroy();
        });
        return mesh;
      })
      .catch(e => handleFatalError(e, logger));

    let uWebSocketsApp: TemplatedApp;

    const meshHTTPHandler = createMeshHTTPHandler({
      baseDir,
      getBuiltMesh: () => mesh$,
      rawServeConfig,
      playgroundTitle,
    });

    if (sslCredentials) {
      const { SSLApp } = await import('uWebSockets.js');
      uWebSocketsApp = SSLApp({
        key_file_name: sslCredentials.key,
        cert_file_name: sslCredentials.cert,
      });
    } else {
      const { App } = await import('uWebSockets.js');
      uWebSocketsApp = App();
    }

    uWebSocketsApp.any('/*', meshHTTPHandler);

    // yoga's envelop may augment the `execute` and `subscribe` operations
    // so we need to make sure we always use the freshest instance
    type EnvelopedExecutionArgs = ExecutionArgs & {
      rootValue: {
        execute: typeof execute;
        subscribe: typeof subscribe;
      };
    };

    const wsHandler = makeBehavior({
      execute: args => (args as EnvelopedExecutionArgs).rootValue.execute(args),
      subscribe: args => (args as EnvelopedExecutionArgs).rootValue.subscribe(args),
      onSubscribe: async (ctx, msg) => {
        const { getEnveloped } = await mesh$;
        const { schema, execute, subscribe, contextFactory, parse, validate } = getEnveloped(ctx);

        const args: EnvelopedExecutionArgs = {
          schema,
          operationName: msg.payload.operationName,
          document: parse(msg.payload.query),
          variableValues: msg.payload.variables,
          contextValue: await contextFactory(),
          rootValue: {
            execute,
            subscribe,
          },
        };

        const errors = validate(args.schema, args.document);
        if (errors.length) return errors;
        return args;
      },
    });

    uWebSocketsApp.ws(graphqlPath, wsHandler);

    uWebSocketsApp.listen(hostname, port, listenSocket => {
      registerTerminateHandler(async eventName => {
        const eventLogger = logger.child(`${eventName}  💀`);
        eventLogger.debug(`Stopping HTTP Server`);
        // eslint-disable-next-line camelcase
        const { us_listen_socket_close } = await import('uWebSockets.js');
        us_listen_socket_close(listenSocket);
        eventLogger.debug(`HTTP Server has been stopped`);
      });
      const shouldntOpenBrowser =
        process.env.NODE_ENV?.toLowerCase() === 'production' || browser === false;
      if (!shouldntOpenBrowser) {
        open(
          serverUrl.replace('0.0.0.0', 'localhost'),
          typeof browser === 'string' ? { app: browser } : undefined,
        ).catch(() => {});
      }
    });

    return mesh$.then(mesh => ({
      mesh,
      httpServer: uWebSocketsApp,
      logger,
    }));
  }
  return null;
}
