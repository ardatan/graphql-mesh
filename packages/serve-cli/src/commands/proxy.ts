import cluster, { Worker } from 'node:cluster';
import { createServeRuntime } from '@graphql-mesh/serve-runtime';
import { registerTerminateHandler } from '@graphql-mesh/utils';
import type { AddCommand, CLIGlobals } from '../cli.js';
import { loadConfig } from '../config.js';
import { startServerForRuntime } from '../server.js';

export const addCommand: AddCommand = ({ log }, cli) =>
  cli
    .command('proxy')
    .description(
      'serve a proxy to a GraphQL API and add additional features such as monitoring/tracing, caching, rate limiting, security, and more',
    )
    .argument('endpoint', 'URL of the endpoint GraphQL API to proxy')
    .action(async function proxy(endpoint) {
      const opts = this.optsWithGlobals<CLIGlobals>();

      const loadedConfig = await loadConfig({
        log,
        configPath: opts.configPath,
        quiet: !cluster.isPrimary,
      });

      const config = {
        logging: log,
        ...loadedConfig,
        ...opts,
        proxy: {
          ...loadedConfig['proxy'],
          endpoint,
        },
        // TODO: make sure there are no other definitions like `hive` or `supergraph` or `subgraph`
      };

      if (cluster.isPrimary && config.fork > 1) {
        const workers: Worker[] = [];
        log.info(`Forking ${config.fork} workers`);
        for (let i = 0; i < config.fork; i++) {
          workers.push(cluster.fork());
        }
        registerTerminateHandler(eventName => {
          log.info(`Killing workers for ${eventName}`);
          workers.forEach((w, i) => {
            w.kill(eventName);
          });
        });
        return;
      }

      log.info(`Proxying requests to ${config.proxy.endpoint}`);

      const runtime = createServeRuntime(config);

      await startServerForRuntime(runtime, {
        ...config,
        host: config.host!, // defaults are defined in cli.ts
        port: config.port!, // defaults are defined in cli.ts
        log,
      });
    });
