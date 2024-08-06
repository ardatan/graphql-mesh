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
    .command('local')
    .description(
      'serve a local Federation supergraph provided by a compliant composition tool such as Mesh Compose or Apollo Rover',
    )
    .argument('[supergraph]', 'path to the composed supergraph schema file', 'supergraph.graphql')
    .action(async function local(supergraphPath) {
      const opts = this.optsWithGlobals<CLIGlobals>();

      const loadedConfig = await loadConfig({
        log,
        configPath: opts.configPath,
        quiet: !cluster.isPrimary,
      });

      const absSupergraphPath = isAbsolute(supergraphPath)
        ? String(supergraphPath)
        : resolve(process.cwd(), supergraphPath);
      try {
        await lstat(absSupergraphPath);
      } catch {
        throw new Error(`Local supergraph at ${absSupergraphPath} does not exist`);
      }

      const config = {
        logging: log,
        ...loadedConfig,
        ...opts,
        supergraph: absSupergraphPath,
        // TODO: make sure there are no other definitions like `hive` or `supergraph` or `subgraph`
      };

      if (cluster.isPrimary) {
        // eslint-disable-next-line @typescript-eslint/consistent-type-imports
        let watcher: typeof import('@parcel/watcher') | undefined;
        try {
          watcher = await import('@parcel/watcher');
        } catch (err) {
          log.warn(
            `If you want to enable hot reloading when ${supergraphPath} changes, install "@parcel/watcher"`,
          );
        }
        if (watcher) {
          try {
            log.info(`Watching ${absSupergraphPath} for changes`);
            const absSupergraphDirname = dirname(absSupergraphPath);
            const subscription = await watcher.subscribe(absSupergraphDirname, (err, events) => {
              if (err) {
                log.error(err);
                return;
              }
              if (
                events.some(event => event.path === absSupergraphPath && event.type === 'update')
              ) {
                log.info(`${absSupergraphPath} changed. Invalidating supergraph...`);
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
              log.info(`Closing watcher for ${absSupergraphPath} for ${eventName}`);
              return subscription.unsubscribe().catch(err => {
                // https://github.com/parcel-bundler/watcher/issues/129
                log.error(`Failed to close watcher for ${absSupergraphPath}!`, err);
              });
            });
          } catch (err) {
            log.error(`Failed to watch ${absSupergraphPath}!`);
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
          workers.forEach((w, i) => {
            w.kill(eventName);
          });
        });
        return;
      }

      const runtime = createServeRuntime(config);

      log.info(`Serving local supergraph from ${absSupergraphPath}`);

      await startServerForRuntime(runtime, {
        ...config,
        host: config.host!, // defaults are defined in cli.ts
        port: config.port!, // defaults are defined in cli.ts
        log,
      });
    });
