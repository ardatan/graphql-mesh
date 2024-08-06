import cluster, { Worker } from 'node:cluster';
import { lstat } from 'node:fs/promises';
import { dirname, isAbsolute, resolve } from 'node:path';
import { createServeRuntime } from '@graphql-mesh/serve-runtime';
import { registerTerminateHandler } from '@graphql-mesh/utils';
import type { AddCommand, CLIGlobals } from '../cli.js';
import { loadConfig } from '../config.js';
import { startServerForRuntime } from '../server.js';

export const addCommand: AddCommand = ({ log }, cli) =>
  cli
    .command('supergraph')
    .description(
      'serve a Federation supergraph provided by a compliant composition tool such as Mesh Compose or Apollo Rover',
    )
    .argument('[schemaPath]', 'path to the composed supergraph schema file', 'supergraph.graphql')
    .action(async function supergraph(schemaPath) {
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
        throw new Error(`Supergraph schema at ${absSchemaPath} does not exist`);
      }

      const config = {
        logging: log,
        ...loadedConfig,
        ...opts,
        supergraph: absSchemaPath,
        hive: {
          ...loadedConfig['hive'],
          token: opts.hiveRegistryToken || loadedConfig['hive']?.['token'],
        },
      };

      if (cluster.isPrimary) {
        // eslint-disable-next-line @typescript-eslint/consistent-type-imports
        let watcher: typeof import('@parcel/watcher') | undefined;
        try {
          watcher = await import('@parcel/watcher');
        } catch (err) {
          log.warn(
            `If you want to enable hot reloading when ${schemaPath} changes, install "@parcel/watcher"`,
          );
        }
        if (watcher) {
          try {
            log.info(`Watching ${absSchemaPath} for changes`);
            const absSupergraphDirname = dirname(absSchemaPath);
            const subscription = await watcher.subscribe(absSupergraphDirname, (err, events) => {
              if (err) {
                log.error(err);
                return;
              }
              if (events.some(event => event.path === absSchemaPath && event.type === 'update')) {
                log.info(`${absSchemaPath} changed. Invalidating supergraph...`);
                if (config.fork > 1) {
                  for (const workerId in cluster.workers) {
                    cluster.workers[workerId].send('invalidateUnifiedGraph');
                  }
                } else {
                  runtime.invalidateUnifiedGraph();
                }
              }
            });
            registerTerminateHandler(eventName => {
              log.info(`Closing watcher for ${absSchemaPath} for ${eventName}`);
              return subscription.unsubscribe().catch(err => {
                // https://github.com/parcel-bundler/watcher/issues/129
                log.error(`Failed to close watcher for ${absSchemaPath}!`, err);
              });
            });
          } catch (err) {
            log.error(`Failed to watch ${absSchemaPath}!`);
            throw err;
          }
        }
      }

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

      log.info(`Serving supergraph from ${absSchemaPath}`);

      await startServerForRuntime(runtime, {
        ...config,
        host: config.host!, // defaults are defined in cli.ts
        port: config.port!, // defaults are defined in cli.ts
        log,
      });
    });
