import cluster, { type Worker } from 'node:cluster';
import { Option } from '@commander-js/extra-typings';
import { createServeRuntime, type MeshServeConfigProxy } from '@graphql-mesh/serve-runtime';
import { registerTerminateHandler } from '@graphql-mesh/utils';
import {
  defaultOptions,
  type AddCommand,
  type CLIContext,
  type CLIGlobals,
  type MeshServeCLIConfig,
} from '../cli.js';
import { loadConfig } from '../config.js';
import { startServerForRuntime } from '../server.js';

export const addCommand: AddCommand = (ctx, cli) =>
  cli
    .command('proxy')
    .description(
      'serve a proxy to a GraphQL API and add additional features such as monitoring/tracing, caching, rate limiting, security, and more',
    )
    .argument('[endpoint]', 'URL of the endpoint GraphQL API to proxy')
    .option(
      '--schema <schemaPathOrUrl>',
      'path to the GraphQL schema file or a url from where to pull the schema',
    )
    .addOption(
      new Option(
        '--hive-cdn-key <key>',
        'Hive CDN API key for fetching the schema. implies that the "schemaPathOrUrl" option is a url',
      ).env('HIVE_CDN_KEY'),
    )
    .action(async function proxy(endpoint) {
      const { hiveCdnKey, hiveRegistryToken, maskedErrors, polling, nativeImport, ...opts } =
        this.optsWithGlobals<CLIGlobals>();
      const loadedConfig = await loadConfig({
        log: ctx.log,
        configPath: opts.configPath,
        quiet: !cluster.isPrimary,
        nativeImport,
      });

      let proxy: MeshServeConfigProxy['proxy'] | undefined;
      if (endpoint) {
        proxy = { endpoint };
      } else if ('proxy' in loadedConfig) {
        proxy = loadedConfig.proxy;
        // TODO: how to provide hive-cdn-key?
      }
      if (!proxy) {
        ctx.log.error(
          'Proxy endpoint not defined. Please provide it in the [endpoint] argument or in the config file.',
        );
        process.exit(1);
      }

      let schema: MeshServeConfigProxy['schema'] | undefined;
      if (opts.schema) {
        schema = hiveCdnKey
          ? {
              type: 'hive',
              endpoint: opts.schema!, // see validation above
              key: hiveCdnKey,
            }
          : opts.schema;
      } else if ('schema' in loadedConfig) {
        schema = loadedConfig.schema;
        // TODO: how to provide hive-cdn-key?
      }
      if (hiveCdnKey && !schema) {
        process.stderr.write(
          `error: option '--schema <schemaPathOrUrl>' is required when providing '--hive-cdn-key <key>'\n`,
        );
        process.exit(1);
      }

      const config: ProxyConfig = {
        ...defaultOptions,
        ...loadedConfig,
        ...opts,
        ...(hiveRegistryToken
          ? {
              reporting: {
                ...loadedConfig.reporting,
                type: 'hive',
                token: hiveRegistryToken,
              },
            }
          : {}),
        ...(polling ? { pollingInterval: polling } : {}),
        proxy,
        schema,
        logging: loadedConfig.logging ?? ctx.log,
      };
      if (maskedErrors != null) {
        // overwrite masked errors from loaded config only when provided
        config.maskedErrors = maskedErrors;
      }
      if (typeof config.pollingInterval === 'number' && config.pollingInterval < 10_000) {
        process.stderr.write(
          `error: polling interval duration too short, use at least 10 seconds\n`,
        );
        process.exit(1);
      }
      return runProxy(ctx, config);
    });

export type ProxyConfig = MeshServeConfigProxy<unknown> & MeshServeCLIConfig;

export async function runProxy({ log }: CLIContext, config: ProxyConfig) {
  if (cluster.isPrimary && config.fork > 1) {
    const workers: Worker[] = [];
    log.info(`Forking ${config.fork} workers`);
    for (let i = 0; i < config.fork; i++) {
      workers.push(cluster.fork());
    }
    registerTerminateHandler(signal => {
      log.info(`Killing workers with ${signal}`);
      workers.forEach(w => {
        w.kill(signal);
      });
    });
    return;
  }

  log.info(`Proxying requests to ${config.proxy.endpoint}`);

  const runtime = createServeRuntime(config);

  await startServerForRuntime(runtime, {
    ...config,
    log,
  });
}
