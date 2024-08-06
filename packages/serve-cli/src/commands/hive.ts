import cluster, { Worker } from 'node:cluster';
import { Option } from '@commander-js/extra-typings';
import { createServeRuntime } from '@graphql-mesh/serve-runtime';
import { registerTerminateHandler } from '@graphql-mesh/utils';
import type { AddCommand, CLIGlobals } from '../cli.js';
import { loadConfig } from '../config.js';
import { startServerForRuntime } from '../server.js';

export const addCommand: AddCommand = ({ log }, cli) =>
  cli
    .command('hive')
    .description(
      "serve a remote supergraph from Hive's High-Availablity CDN and report usage data to Hive's registry",
    )
    .addOption(
      new Option('--endpoint <endpoint>', 'Hive CDN endpoint for fetching the supergraph')
        .env('HIVE_CDN_ENDPOINT')
        .makeOptionMandatory(),
    )
    .addOption(
      new Option('--key <key>', 'Hive CDN API key for fetching the supergraph')
        .env('HIVE_CDN_KEY')
        .makeOptionMandatory(),
    )
    .action(async function hive() {
      const { endpoint, key, ...opts } = this.optsWithGlobals<CLIGlobals>();

      const loadedConfig = await loadConfig({
        log,
        configPath: opts.configPath,
        quiet: !cluster.isPrimary,
      });

      const config = {
        logging: log,
        ...loadedConfig,
        ...opts,
        hive: {
          endpoint,
          key,
        },
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

      const runtime = createServeRuntime(config);

      log.info(`Serving Hive CDN supergraph from ${endpoint}`);

      await startServerForRuntime(runtime, {
        ...config,
        host: config.host!, // defaults are defined in cli.ts
        port: config.port!, // defaults are defined in cli.ts
        log,
      });
    });
