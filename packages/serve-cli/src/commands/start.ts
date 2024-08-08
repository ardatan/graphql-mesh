import type { AddCommand, CLIGlobals, MeshServeCLIConfig } from '../cli.js';
import { loadConfig } from '../config.js';
import { runProxy } from './proxy.js';
import { runSubgraph } from './subgraph.js';
import { runSupergraph } from './supergraph.js';

export const addCommand: AddCommand = (ctx, cli) =>
  cli
    .command('start', { isDefault: true })
    .description('start the Mesh Serve using the config to decide what to do (default)')
    .action(async function start() {
      const opts = this.optsWithGlobals<CLIGlobals>();
      const loadedConfig = await loadConfig({ log: ctx.log, configPath: opts.configPath });
      const config = {
        logging: ctx.log,
        ...loadedConfig,
        reporting: {
          ...loadedConfig.reporting,
          ...(opts.hiveRegistryToken
            ? {
                type: 'hive',
                token: opts.hiveRegistryToken,
              }
            : {}),
        },
      } satisfies MeshServeCLIConfig;

      if ('supergraph' in config) {
        const { supergraph } = config;
        if (!supergraph) {
          throw 'Missing "supergraph" property'; // should never happen
        }
        return runSupergraph(ctx, { supergraph, ...config });
      }
      if ('subgraph' in config) {
        const { subgraph } = config;
        if (!subgraph) {
          throw 'Missing "subgraph" property'; // should never happen
        }
        return runSubgraph(ctx, { subgraph, ...config });
      }
      if ('proxy' in config) {
        const { proxy } = config;
        if (!proxy) {
          throw 'Missing "proxy" property'; // should never happen
        }
        return runProxy(ctx, { proxy, ...config });
      }

      throw new Error('Cannot decide what to do while interpreting the config');
    });
