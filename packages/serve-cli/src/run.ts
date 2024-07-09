import 'json-bigint-patch'; // JSON.parse/stringify with bigints support
import 'tsx/cjs'; // support importing typescript configs in CommonJS
import 'tsx/esm'; // support importing typescript configs in ESM
import 'dotenv/config'; // inject dotenv options to process.env

// eslint-disable-next-line import/no-nodejs-modules
import cluster from 'cluster';
// eslint-disable-next-line import/no-nodejs-modules
import { availableParallelism, release } from 'os';
// eslint-disable-next-line import/no-nodejs-modules
import { dirname, isAbsolute, resolve } from 'path';
import { Command, InvalidArgumentError, Option } from '@commander-js/extra-typings';
import type { UnifiedGraphConfig } from '@graphql-mesh/serve-runtime';
import { createServeRuntime } from '@graphql-mesh/serve-runtime';
import type { Logger } from '@graphql-mesh/types';
import { DefaultLogger, getTerminateStack, registerTerminateHandler } from '@graphql-mesh/utils';
import { isValidPath } from '@graphql-tools/utils';
import { startNodeHttpServer } from './nodeHttp.js';
import type { MeshServeCLIConfig } from './types.js';
import { startuWebSocketsServer } from './uWebSockets.js';

const defaultFork = process.env.NODE_ENV === 'production' ? availableParallelism() : 1;

/** Default config paths sorted by priority. */
const defaultConfigPaths = [
  'mesh.config.ts',
  'mesh.config.mts',
  'mesh.config.cts',
  'mesh.config.js',
  'mesh.config.mjs',
  'mesh.config.cjs',
];
const joinedDefaultConfigPaths = defaultConfigPaths.join(' or ');

let program = new Command()
  .addOption(
    new Option(
      '--fork [count]',
      'count of workers to spawn. defaults to `os.availableParallelism()` when NODE_ENV is "production", otherwise only one (the main) worker',
    )
      .env('FORK')
      .argParser(v => {
        const count = parseInt(v);
        if (isNaN(count)) {
          throw new InvalidArgumentError('not a number.');
        }
        return count;
      })
      .default(defaultFork),
  )
  .addOption(
    new Option('-c, --config-path <path>', 'path to the configuration file')
      .env('CONFIG_PATH')
      .default(joinedDefaultConfigPaths),
  )
  .option(
    '-h, --host <hostname>',
    'host to use for serving',
    release().toLowerCase().includes('microsoft') ? '127.0.0.1' : '0.0.0.0',
  )
  .option(
    '-p, --port <number>',
    'port to use for serving',
    v => {
      const port = parseInt(v);
      if (isNaN(port)) {
        throw new InvalidArgumentError('not a number.');
      }
      return port;
    },
    4000,
  )
  .addOption(new Option('--supergraph <path>', 'path to the supergraph schema'));

export interface RunOptions extends ReturnType<typeof program.opts> {
  /** @default new DefaultLogger() */
  log?: Logger;
  /** @default Mesh Serve */
  productName?: string;
  /** @default serve GraphQL federated architecture for any API service(s) */
  productDescription?: string;
  /** @default mesh-serve */
  binName?: string;
  /** @default undefined */
  version?: string;
}

export async function run({
  log: rootLog = new DefaultLogger(),
  productName = 'Mesh',
  productDescription = 'serve GraphQL federated architecture for any API service(s)',
  binName = 'mesh-serve',
  version,
}: RunOptions) {
  program = program.name(binName).description(productDescription);
  if (version) program = program.version(version);
  const opts = program.parse().opts();

  const log = rootLog.child(
    cluster.worker?.id ? `🕸️  ${productName} Worker#${cluster.worker.id}` : `🕸️  ${productName}`,
  );

  let importedConfig: MeshServeCLIConfig;
  if (opts.configPath === joinedDefaultConfigPaths) {
    log.info(`Searching for default config files`);
    for (const configPath of defaultConfigPaths) {
      importedConfig = await importConfig(log, resolve(process.cwd(), configPath));
      if (importedConfig) {
        break;
      }
    }
  } else {
    // using user-provided config
    const configPath = isAbsolute(opts.configPath)
      ? opts.configPath
      : resolve(process.cwd(), opts.configPath);
    log.info(`Loading config file at path ${configPath}`);
    importedConfig = await importConfig(log, configPath);
    if (!importedConfig) {
      throw new Error(`Cannot find config file at ${joinedDefaultConfigPaths}`);
    }
  }
  if (importedConfig) {
    log.info('Loaded config file');
  } else {
    log.debug('No config file loaded, using defaults');
  }

  const config: MeshServeCLIConfig = {
    ...importedConfig,
    ...opts,
  };

  let unifiedGraphPath: UnifiedGraphConfig;
  if ('supergraph' in config) {
    unifiedGraphPath = config.supergraph;
  }

  if (!('proxy' in config) && !('hive' in config)) {
    unifiedGraphPath = './supergraph.graphql';
  }

  if ('hive' in config || process.env.HIVE_CDN_ENDPOINT) {
    unifiedGraphPath = 'Hive CDN';
  }

  let loadingMessage: string;

  if (typeof unifiedGraphPath === 'string') {
    loadingMessage = `Loading Supergraph from ${unifiedGraphPath}`;
  } else {
    loadingMessage = `Loading Supergraph`;
  }

  log.info(loadingMessage);

  if (cluster.isPrimary) {
    const fork = opts.fork === true ? defaultFork : opts.fork;

    if (isValidPath(unifiedGraphPath)) {
      // eslint-disable-next-line @typescript-eslint/consistent-type-imports
      let watcher: typeof import('@parcel/watcher') | undefined;
      try {
        watcher = await import('@parcel/watcher');
      } catch (err) {
        log.warn(
          `If you want to enable hot reloading when ${unifiedGraphPath} changes, install "@parcel/watcher"`,
        );
      }
      if (watcher) {
        try {
          const absoluteUnifiedGraphPath = isAbsolute(String(unifiedGraphPath))
            ? String(unifiedGraphPath)
            : resolve(process.cwd(), String(unifiedGraphPath));
          const absolutUnifiedGraphDir = dirname(absoluteUnifiedGraphPath);
          const subscription = await watcher.subscribe(absolutUnifiedGraphDir, (err, events) => {
            if (err) {
              log.error(err);
              return;
            }
            if (events.some(event => event.path === absoluteUnifiedGraphPath)) {
              log.info(`Supergraph changed`);
              if (fork > 1) {
                for (const workerId in cluster.workers) {
                  cluster.workers[workerId].send('invalidateUnifiedGraph');
                }
              } else {
                handler.invalidateUnifiedGraph();
              }
            }
          });
          registerTerminateHandler(eventName => {
            log.info(`Closing watcher for ${absoluteUnifiedGraphPath} for ${eventName}`);
            return subscription.unsubscribe();
          });
        } catch (err) {
          log.error(`Failed to watch ${unifiedGraphPath}!`);
          throw err;
        }
      }
    }

    if (fork > 1) {
      log.info(`Forking ${fork} ${productName} Workers`);
      for (let i = 0; i < fork; i++) {
        log.info(`Forking ${productName} Worker #${i}`);
        const worker = cluster.fork();
        registerTerminateHandler(eventName => {
          log.info(`Closing ${productName} Worker #${i} for ${eventName}`);
          worker.kill(eventName);
          log.info(`Closed ${productName} Worker #${i} for ${eventName}`);
        });
        log.info(`Forked ${productName} Worker #${i}`);
      }
      log.info(`Forked ${fork} ${productName} Workers`);
      return;
    }
  }

  const port = config.port!;
  const host = config.host!;
  const protocol = config.sslCredentials ? 'https' : 'http';

  const handler = createServeRuntime({
    logging: log,
    ...config,
  });
  const terminateStack = getTerminateStack();
  terminateStack.use(handler);
  process.on('message', message => {
    if (message === 'invalidateUnifiedGraph') {
      log.info(`Invalidating Supergraph`);
      handler.invalidateUnifiedGraph();
    }
  });

  let uWebSocketsAvailable = false;
  try {
    await import('uWebSockets.js');
    uWebSocketsAvailable = true;
  } catch (err) {
    log.warn('uWebSockets.js is not available currently so the server will fallback to node:http.');
  }
  const startServer = uWebSocketsAvailable ? startuWebSocketsServer : startNodeHttpServer;
  const server = await startServer({
    handler,
    log,
    protocol,
    host,
    port,
    sslCredentials: config.sslCredentials,
  });
  terminateStack.use(server);
}

async function importConfig(log: Logger, path: string): Promise<MeshServeCLIConfig | null> {
  try {
    const importedConfigModule = await import(path);
    if ('default' in importedConfigModule) {
      return importedConfigModule.default.serveConfig;
    } else if ('serveConfig' in importedConfigModule) {
      return importedConfigModule.serveConfig;
    }
  } catch (err) {
    if (err.code !== 'ERR_MODULE_NOT_FOUND') {
      log.error('Importing configuration failed!');
      throw err;
    }
  }
  return null;
}
