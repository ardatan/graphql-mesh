import 'json-bigint-patch'; // JSON.parse/stringify with bigints support
import 'dotenv/config'; // inject dotenv options to process.env

// eslint-disable-next-line import/no-nodejs-modules
import cluster from 'cluster';
// eslint-disable-next-line import/no-nodejs-modules
import { availableParallelism, release } from 'os';
// eslint-disable-next-line import/no-nodejs-modules
import { dirname, isAbsolute, resolve } from 'path';
import createJITI from 'jiti';
// import { tsImport } from 'tsx/dist/esm/api/index.mjs';
import { Command, InvalidArgumentError, Option } from '@commander-js/extra-typings';
import type { UnifiedGraphConfig } from '@graphql-mesh/serve-runtime';
import { createServeRuntime } from '@graphql-mesh/serve-runtime';
import type { Logger } from '@graphql-mesh/types';
import { DefaultLogger, getTerminateStack, registerTerminateHandler } from '@graphql-mesh/utils';
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
    new Option(
      '-c, --config-path <path>',
      `path to the configuration file. defaults to the following files respectively in the current working directory: ${defaultConfigPaths.join(', ')}`,
    ).env('CONFIG_PATH'),
  )
  .option(
    '-h, --host <hostname>',
    'host to use for serving',
    release().toLowerCase().includes('microsoft') ? '127.0.0.1' : '0.0.0.0',
  )
  .addOption(
    new Option('-p, --port <number>', 'port to use for serving')
      .env('PORT')
      .default(4000)
      .argParser(v => {
        const port = parseInt(v);
        if (isNaN(port)) {
          throw new InvalidArgumentError('not a number.');
        }
        return port;
      }),
  )
  .option('--supergraph <path>', 'path to the supergraph schema')
  .addOption(
    new Option('--polling <intervalInMs>', 'schema polling interval in milliseconds')
      .env('POLLING')
      .argParser(v => {
        const interval = parseInt(v);
        if (isNaN(interval)) {
          throw new InvalidArgumentError('not a number.');
        }
        return interval;
      }),
  )
  .option('--masked-errors', 'mask unexpected errors in responses', true)
  .option('--no-masked-errors', "don't mask unexpected errors in responses", false);

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
  version = 'MESH_VERSION',
}: RunOptions) {
  program = program.name(binName).description(productDescription).version(version);
  const opts = program.parse().opts();

  const log = rootLog.child(
    cluster.worker?.id ? `🕸️  ${productName} Worker#${cluster.worker.id}` : `🕸️  ${productName}`,
  );

  let importedConfig: MeshServeCLIConfig;
  if (!opts.configPath) {
    log.info(`Searching for default config files`);
    for (const configPath of defaultConfigPaths) {
      importedConfig = await importConfig(log, resolve(process.cwd(), configPath));
      if (importedConfig) {
        log.info(`Found default config file ${configPath}`);
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
      throw new Error(`Cannot find config file at ${configPath}`);
    }
  }
  if (importedConfig) {
    log.info('Loaded config file');
  } else {
    log.info('No config file loaded, using defaults');
  }

  const config: MeshServeCLIConfig = {
    ...importedConfig,
    ...opts,
  };

  let unifiedGraphPath: UnifiedGraphConfig | null = null;
  if ('supergraph' in config) {
    // path
    unifiedGraphPath = config.supergraph;
    log.info(`Loading Supergraph from ${unifiedGraphPath}`);
  } else if ('hive' in config || process.env.HIVE_CDN_ENDPOINT) {
    // hive
    log.info('Loading Supergraph from Hive CDN');
  } else if (!('proxy' in config)) {
    // default
    unifiedGraphPath = 'supergraph.graphql';
    log.info(`Loading Supergraph from ${unifiedGraphPath}`);
  }

  if (cluster.isPrimary) {
    const fork = opts.fork === true ? defaultFork : opts.fork;

    if (unifiedGraphPath) {
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

const jiti = createJITI(
  // import.meta.url is not available in CJS (and cant even be in the syntax) and __filename is not available in ESM
  // instead, we dont care about the file path because we'll require config imports to have absolute paths
  '',
);

async function importConfig(log: Logger, path: string): Promise<MeshServeCLIConfig | null> {
  if (!isAbsolute(path)) {
    throw new Error('Configs can be imported using absolute paths only'); // see createJITI for explanation
  }
  try {
    const importedConfigModule = await jiti.import(path, {});
    if (!importedConfigModule || typeof importedConfigModule !== 'object') {
      throw new Error('Invalid imported config module!');
    }
    if ('default' in importedConfigModule) {
      // eslint-disable-next-line dot-notation
      return importedConfigModule.default['serveConfig'];
    } else if ('serveConfig' in importedConfigModule) {
      return importedConfigModule.serveConfig as MeshServeCLIConfig;
    }
  } catch (err) {
    // NOTE: we dont use the err.code because maybe the config itself is importing a module that does not exist.
    //       if we were to use the MODULE_NOT_FOUND code, then those configs will fail silently
    if (String(err).includes(`Cannot find module '${path}'`)) {
      // config at path not found
    } else {
      log.error(`Importing config at ${path} failed!`);
      throw err;
    }
  }
  return null;
}
