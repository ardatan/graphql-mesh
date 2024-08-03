import { createServeRuntime } from '@graphql-mesh/serve-runtime';
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

      const loadedConfig = await loadConfig({ log, configPath: opts.configPath });

      const config = {
        ...loadedConfig,
        ...opts,
        proxy: {
          ...loadedConfig['proxy'],
          endpoint,
        },
        // TODO: make sure there are no other definitions like `hive` or `supergraph` or `subgraph`
      };

      log.info(`Proxying requests to ${config.proxy.endpoint}`);

      const runtime = createServeRuntime(config);

      await startServerForRuntime(runtime, {
        ...config,
        log,
      });
    });
