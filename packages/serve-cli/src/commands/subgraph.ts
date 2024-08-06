import cluster, { Worker } from 'node:cluster';
import { lstat } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import { createServeRuntime } from '@graphql-mesh/serve-runtime';
import { registerTerminateHandler } from '@graphql-mesh/utils';
import type { AddCommand, CLIGlobals } from '../cli.js';
import { loadConfig } from '../config.js';
import { startServerForRuntime } from '../server.js';

export const addCommand: AddCommand = ({ log }, cli) =>
  cli
    .command('subgraph')
    .description(
      'serve a Federation subgraph that can be used with any Federation compatible router like Mesh Serve or Apollo Router',
    )
    .argument('[schemaPath]', 'path to the subgraph schema file', 'subgraph.graphql')
    .action(async function subgraph(schemaPath) {
      const opts = this.optsWithGlobals<CLIGlobals>();

      const loadedConfig = await loadConfig({
        log,
        configPath: opts.configPath,
        quiet: !cluster.isPrimary,
      });

      const absSchemaPath = isAbsolute(schemaPath)
        ? String(schemaPath)
        : resolve(process.cwd(), schemaPath);
      try {
        await lstat(absSchemaPath);
      } catch {
        throw new Error(`Subgraph schema at ${absSchemaPath} does not exist`);
      }

      const config = {
        logging: log,
        ...loadedConfig,
        ...opts,
        subgraph: absSchemaPath,
        hive: {
          ...loadedConfig['hive'],
          token: opts.hiveRegistryToken || loadedConfig['hive']?.['token'],
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
          workers.forEach(w => {
            w.kill(eventName);
          });
        });
        return;
      }

      const runtime = createServeRuntime(config);

      log.info(`Serving subgraph from ${absSchemaPath}`);

      await startServerForRuntime(runtime, {
        ...config,
        host: config.host!, // defaults are defined in cli.ts
        port: config.port!, // defaults are defined in cli.ts
        log,
      });
    });
