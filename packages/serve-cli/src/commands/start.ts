import { createServeRuntime } from '@graphql-mesh/serve-runtime';
import type { AddCommand, CLIGlobals } from '../cli.js';
import { loadConfig } from '../config.js';
import { startServerForRuntime } from '../server.js';

export const addCommand: AddCommand = ({ log }, cli) =>
  cli
    .command('start', { isDefault: true })
    .description('start the Mesh Serve using the config to decide what to do (default)')
    .action(async function start() {
      const opts = this.optsWithGlobals<CLIGlobals>();

      const loadedConfig = await loadConfig({ log, configPath: opts.configPath });

      const config = {
        logging: log,
        ...loadedConfig,
        ...opts,
        hive: {
          ...loadedConfig['hive'],
          token: opts.hiveRegistryToken || loadedConfig['hive']?.['token'],
        },
      };

      // TODO: decide what to do using the config, also fork

      const runtime = createServeRuntime(config);

      await startServerForRuntime(runtime, {
        ...config,
        host: config.host!, // defaults are defined in cli.ts
        port: config.port!, // defaults are defined in cli.ts
        log,
      });
    });
