import type { AddCommand, CLIGlobals, MeshServeCLIConfig } from '../cli.js';
import { loadConfig } from '../config.js';
import { runProxy } from './proxy.js';
import { runSubgraph } from './subgraph.js';
import { runSupergraph } from './supergraph.js';

export const addCommand: AddCommand = (ctx, cli) =>
  cli
    .command('start', { isDefault: true })
    .description(
      'start the Mesh Serve using the config to decide what to do. if the config is empty or missing, will run the "supergraph" command (default)',
    )
    .action(async function start() {
      const { maskedErrors, ...opts } = this.optsWithGlobals<CLIGlobals>();
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
      if (maskedErrors != null) {
        // overwrite masked errors from loaded config only when provided
        config.maskedErrors = maskedErrors;
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
      const supergraph = config['supergraph'] || 'supergraph.graphql';
      return runSupergraph(ctx, { supergraph, ...config });
    });
