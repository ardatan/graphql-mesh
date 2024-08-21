import '@graphql-mesh/include/register-tsconfig-paths';
import 'dotenv/config'; // inject dotenv options to process.env
import 'json-bigint-patch'; // JSON.parse/stringify with bigints support

import cluster from 'node:cluster';
import { availableParallelism, release } from 'node:os';
import parseDuration from 'parse-duration';
import { Command, InvalidArgumentError, Option } from '@commander-js/extra-typings';
import type {
  MeshServeConfigProxy,
  MeshServeConfigSubgraph,
  MeshServeConfigSupergraph,
} from '@graphql-mesh/serve-runtime';
import type { Logger } from '@graphql-mesh/types';
import { DefaultLogger } from '@graphql-mesh/utils';
import { addCommands } from './commands/index.js';
import { defaultConfigPaths } from './config.js';
import type { ServerConfig } from './server';

export type MeshServeCLIConfig = (
  | MeshServeCLISupergraphConfig
  | MeshServeCLISubgraphConfig
  | MeshServeCLIProxyConfig
) &
  ServerConfig & {
    /**
     * Count of workers to spawn. Defaults to `os.availableParallelism()` when NODE_ENV
     * is "production", otherwise only one (the main) worker.
     */
    fork?: number;
    /**
     * GraphQL schema polling interval in milliseconds.
     *
     * @default 10_000
     */
    pollingInterval?: number;
  };

export interface MeshServeCLISupergraphConfig
  extends Omit<MeshServeConfigSupergraph, 'supergraph'> {
  /**
   * SDL, path or an URL to the Federation Supergraph.
   *
   * Alternatively, CDN options for pulling a remote Federation Supergraph.
   *
   * @default 'supergraph.graphql'
   */
  // default matches commands/supergraph.ts
  supergraph?: MeshServeConfigSupergraph['supergraph'];
}

export interface MeshServeCLISubgraphConfig extends Omit<MeshServeConfigSubgraph, 'subgraph'> {
  /**
   * SDL, path or an URL to the Federation Supergraph.
   *
   * Alternatively, CDN options for pulling a remote Federation Supergraph.
   *
   * @default 'subgraph.graphql'
   */
  // default matches commands/subgraph.ts
  subgraph?: MeshServeConfigSubgraph['subgraph'];
}

export interface MeshServeCLIProxyConfig extends Omit<MeshServeConfigProxy, 'proxy'> {
  /**
   * HTTP executor to proxy all incoming requests to another HTTP endpoint.
   */
  proxy?: MeshServeConfigProxy['proxy'];
}

/**
 * Type helper for defining the config.
 */
export function defineConfig(config: MeshServeCLIConfig) {
  return config;
}

/** The context of the running program. */
export interface CLIContext {
  /** @default new DefaultLogger() */
  log: Logger;
  /** @default 'Mesh Serve' */
  productName: string;
  /** @default 'serve GraphQL federated architecture for any API service(s)' */
  productDescription: string;
  /** @default 'mesh-serve' */
  binName: string;
  /** @default globalThis.__VERSION__ */
  version: string;
}

/** Inferred program options from the root command {@link cli}. */
export type CLIGlobals = CLI extends Command<any, infer O> ? O : never;

export type CLI = typeof cli;

export type AddCommand = (ctx: CLIContext, cli: CLI) => void;

// we dont use `Option.default()` in the command definitions because we want the CLI options to
// override the config file (with option defaults, config file will always be overwritten)
export const defaultOptions = {
  fork: process.env.NODE_ENV === 'production' ? availableParallelism() : 1,
  host: release().toLowerCase().includes('microsoft') ? '127.0.0.1' : '0.0.0.0',
  port: 4000,
  polling: '10s',
};

/** The root cli of serve-cli. */
let cli = new Command()
  .configureHelp({
    // will print help of global options for each command
    showGlobalOptions: true,
  })
  .addOption(
    new Option(
      '--fork <count>',
      `count of workers to spawn. defaults to "os.availableParallelism()" when NODE_ENV is "production", otherwise only one (the main) worker (default: ${JSON.stringify(defaultOptions.fork)}`,
    )
      .env('FORK')
      .argParser(v => {
        const count = parseInt(v);
        if (isNaN(count)) {
          throw new InvalidArgumentError('not a number.');
        }
        return count;
      }),
  )
  .addOption(
    new Option(
      '-c, --config-path <path>',
      `path to the configuration file. defaults to the following files respectively in the current working directory: ${defaultConfigPaths.join(', ')}`,
    ).env('CONFIG_PATH'),
  )
  .option(
    '-h, --host <hostname>',
    `host to use for serving (default: ${JSON.stringify(defaultOptions.host)}`,
    defaultOptions.host,
  )
  .addOption(
    new Option(
      '-p, --port <number>',
      `port to use for serving (default: ${JSON.stringify(defaultOptions.port)}`,
    )
      .env('PORT')
      .argParser(v => {
        const port = parseInt(v);
        if (isNaN(port)) {
          throw new InvalidArgumentError('not a number.');
        }
        return port;
      }),
  )
  .addOption(
    new Option(
      '--polling <duration>',
      `schema polling interval in human readable duration (default: ${JSON.stringify(defaultOptions.polling)})`,
    )
      .env('POLLING')
      .argParser(v => {
        const interval = parseDuration(v);
        if (!interval) {
          throw new InvalidArgumentError('not a duration.');
        }
        return interval;
      }),
  )
  .option('--no-masked-errors', "don't mask unexpected errors in responses")
  .option(
    '--masked-errors',
    'mask unexpected errors in responses (default: true)',
    // we use "null" intentionally so that we know when the user provided the flag vs when not
    // see here https://github.com/tj/commander.js/blob/970ecae402b253de691e6a9066fea22f38fe7431/lib/command.js#L655
    null,
  )
  .option('--native-import', 'use the native "import" function for importing the config file')
  .addOption(
    new Option(
      '--hive-registry-token <token>',
      'Hive registry token for usage metrics reporting',
    ).env('HIVE_REGISTRY_TOKEN'),
  )
  .option(
    '--hive-persisted-documents-endpoint <endpoint>',
    '[EXPERIMENTAL] Hive CDN endpoint for fetching the persisted documents. requires the "--hive-persisted-documents-token <token>" option',
  )
  .option(
    '--hive-persisted-documents-token <token>',
    '[EXPERIMENTAL] Hive persisted documents CDN endpoint. requires the "--hive-persisted-documents-endpoint <endpoint>" option',
  )
  .addOption(
    new Option('--hive-cdn-endpoint <endpoint>', 'Hive CDN endpoint for fetching the schema').env(
      'HIVE_CDN_ENDPOINT',
    ),
  )
  .addOption(
    new Option(
      '--hive-cdn-key <key>',
      'Hive CDN API key for fetching the schema. implies that the "schemaPathOrUrl" argument is a url',
    ).env('HIVE_CDN_KEY'),
  )
  .addOption(
    new Option(
      '--apollo-graph-ref <graphRef>',
      'Apollo graph ref of the managed federation graph (<YOUR_GRAPH_ID>@<VARIANT>)',
    ).env('APOLLO_GRAPH_REF'),
  )
  .addOption(
    new Option(
      '--apollo-key <apiKey>',
      'Apollo API key to use to authenticate with the managed federation up link',
    ).env('APOLLO_KEY'),
  );

export function run(userCtx: Partial<CLIContext>) {
  const ctx: CLIContext = {
    log: new DefaultLogger(),
    productName: 'Mesh',
    productDescription: 'serve GraphQL federated architecture for any API service(s)',
    binName: 'mesh-serve',
    version: globalThis.__VERSION__,
    ...userCtx,
  };

  const { binName, productDescription, version } = ctx;
  cli = cli.name(binName).description(productDescription);
  cli.version(version);

  if (cluster.worker?.id) {
    ctx.log = ctx.log.child(`Worker #${cluster.worker.id}`);
  }

  addCommands(ctx, cli);

  return cli.parseAsync();
}
