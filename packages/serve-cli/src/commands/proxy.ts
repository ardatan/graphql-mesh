import cluster, { Worker } from 'node:cluster';
import { Option } from '@commander-js/extra-typings';
import { createServeRuntime, type MeshServeConfigProxy } from '@graphql-mesh/serve-runtime';
import { registerTerminateHandler } from '@graphql-mesh/utils';
import type { AddCommand, CLIContext, CLIGlobals, MeshServeCLIConfig } from '../cli.js';
import { loadConfig } from '../config.js';
import { startServerForRuntime } from '../server.js';

export const addCommand: AddCommand = (ctx, cli) =>
  cli
    .command('proxy')
    .description(
      'serve a proxy to a GraphQL API and add additional features such as monitoring/tracing, caching, rate limiting, security, and more',
    )
    .argument('endpoint', 'URL of the endpoint GraphQL API to proxy')
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
      const opts = this.optsWithGlobals<CLIGlobals>();
      const loadedConfig = await loadConfig({
        log: ctx.log,
        configPath: opts.configPath,
        quiet: !cluster.isPrimary,
      });
      const config: ProxyConfig = {
        ...loadedConfig,
        ...opts,
        proxy: {
          ...loadedConfig['proxy'],
          endpoint,
        },
        // schema:
      };
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
