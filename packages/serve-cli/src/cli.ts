import 'dotenv/config'; // inject dotenv options to process.env
import 'json-bigint-patch'; // JSON.parse/stringify with bigints support

import cluster from 'node:cluster';
import { availableParallelism, release } from 'node:os';
import { Command, InvalidArgumentError, Option } from '@commander-js/extra-typings';
import type { Logger } from '@graphql-mesh/types';
import { DefaultLogger } from '@graphql-mesh/utils';
import { addCommands } from './commands';
import { defaultConfigPaths } from './config.js';

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

export const defaultFork = process.env.NODE_ENV === 'production' ? availableParallelism() : 1;

export type CLI = typeof cli;

export type AddCommand = (ctx: CLIContext, cli: CLI) => void;

/** The root cli of serve-cli. */
let cli = new Command()
  .configureHelp({
    // will print help of global options for each command
    showGlobalOptions: true,
  })
  .addOption(
    new Option(
      '--fork <count>',
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
  .addOption(
    new Option(
      '--hive-registry-token <token>',
      'Hive registry token for usage metrics reporting',
    ).env('HIVE_REGISTRY_TOKEN'),
  );

// @inject-version globalThis.__VERSION__ here

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

  const log = ctx.log.child(
    cluster.worker?.id ? `${ctx.productName} worker #${cluster.worker.id}` : ctx.productName,
  );

  addCommands({ ...ctx, log }, cli);

  return cli.parseAsync();
}
