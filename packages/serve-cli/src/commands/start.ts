import type { AddCommand, CLIGlobals } from '../cli.js';
import { loadConfig } from '../config.js';
import type { MeshServeCLIConfig } from '../types.js';
import { proxy } from './proxy.js';
import { subgraph } from './subgraph.js';
import { supergraph } from './supergraph.js';

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
        fork: opts.fork!, // defaults are defined in global cli options
        host: opts.host!, // defaults are defined in global cli options
        port: opts.port!, // defaults are defined in global cli options
        hive: {
          ...loadedConfig['hive'],
          token: opts.hiveRegistryToken || loadedConfig['hive']?.['token'],
        },
      } satisfies MeshServeCLIConfig;

      if ('supergraph' in config) {
        return supergraph(ctx, config);
      }
      if ('subgraph' in config) {
        return subgraph(
          ctx,
          // @ts-expect-error TODO: subgraph will be defined according to types
          config,
        );
      }
      if ('proxy' in config) {
        return proxy(
          ctx,
          // @ts-expect-error TODO: proxy will be defined according to types
          config,
        );
      }
      throw new Error('Cannot decide what to do while interpreting the config');
    });
