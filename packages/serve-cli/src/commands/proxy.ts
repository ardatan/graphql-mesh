import cluster, { Worker } from 'node:cluster';
import { createServeRuntime, type MeshServeConfigProxy } from '@graphql-mesh/serve-runtime';
import { registerTerminateHandler } from '@graphql-mesh/utils';
import type { AddCommand, CLIContext, CLIGlobals } from '../cli.js';
import { loadConfig } from '../config.js';
import { startServerForRuntime, type ServerConfig } from '../server.js';

export const addCommand: AddCommand = (ctx, cli) =>
  cli
    .command('proxy')
    .description(
      'serve a proxy to a GraphQL API and add additional features such as monitoring/tracing, caching, rate limiting, security, and more',
    )
    .argument('endpoint', 'URL of the endpoint GraphQL API to proxy')
    .action(async function (endpoint) {
      const opts = this.optsWithGlobals<CLIGlobals>();
      const loadedConfig = await loadConfig({
        log: ctx.log,
        configPath: opts.configPath,
        quiet: !cluster.isPrimary,
      });
      const config: ProxyConfig = {
        ...loadedConfig,
        ...opts,
        fork: opts.fork!, // defaults are defined in global cli options
        host: opts.host!, // defaults are defined in global cli options
        port: opts.port!, // defaults are defined in global cli options
        proxy: {
          ...loadedConfig['proxy'],
          endpoint,
        },
      };
      return proxy(ctx, config);
    });

export type ProxyConfig = MeshServeConfigProxy<unknown> &
  ServerConfig & {
    fork: number;
  };

export async function proxy({ log }: CLIContext, config: ProxyConfig) {
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
