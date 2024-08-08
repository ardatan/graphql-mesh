import cluster, { Worker } from 'node:cluster';
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
