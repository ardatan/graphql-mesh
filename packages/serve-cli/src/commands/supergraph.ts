import cluster, { Worker } from 'node:cluster';
import { lstat } from 'node:fs/promises';
import { dirname, isAbsolute, resolve } from 'node:path';
import { createServeRuntime, type MeshServeConfigSupergraph } from '@graphql-mesh/serve-runtime';
import { registerTerminateHandler } from '@graphql-mesh/utils';
import type { AddCommand, CLIContext, CLIGlobals, MeshServeCLIConfig } from '../cli.js';
import { loadConfig } from '../config.js';
import { startServerForRuntime } from '../server.js';

export const addCommand: AddCommand = (ctx, cli) =>
  cli
    .command('supergraph')
    .description(
      'serve a Federation supergraph provided by a compliant composition tool such as Mesh Compose or Apollo Rover',
    )
    .argument('[schemaPath]', 'path to the composed supergraph schema file', 'supergraph.graphql')
    .action(async function supergraph(schemaPath) {
      const opts = this.optsWithGlobals<CLIGlobals>();
      console.log(opts);
      const loadedConfig = await loadConfig({
        log: ctx.log,
        configPath: opts.configPath,
        quiet: !cluster.isPrimary,
      });
      const config: SupergraphConfig = {
        ...loadedConfig,
        ...opts,
        supergraph: schemaPath,
      };
      return runSupergraph(ctx, config);
    });

export type SupergraphConfig = MeshServeConfigSupergraph<unknown> & MeshServeCLIConfig;

export async function runSupergraph({ log }: CLIContext, config: SupergraphConfig) {
  let absSchemaPath: string | null = null;
  if (typeof config.supergraph === 'undefined' || typeof config.supergraph === 'string') {
    const supergraphPath = config.supergraph || 'supergraph.graphql';
    absSchemaPath = isAbsolute(supergraphPath)
      ? String(supergraphPath)
      : resolve(process.cwd(), supergraphPath);
    try {
      await lstat(absSchemaPath);
    } catch {
      throw new Error(`Supergraph schema at ${absSchemaPath} does not exist`);
    }
  }

  if (absSchemaPath && cluster.isPrimary) {
    // eslint-disable-next-line @typescript-eslint/consistent-type-imports
    let watcher: typeof import('@parcel/watcher') | undefined;
    try {
      watcher = await import('@parcel/watcher');
    } catch (err) {
      log.warn(
        `If you want to enable hot reloading when ${absSchemaPath} changes, install "@parcel/watcher"`,
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
        registerTerminateHandler(signal => {
          log.info(`Closing watcher for ${absSchemaPath} on ${signal}`);
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
    registerTerminateHandler(signal => {
      log.info(`Killing workers with ${signal}`);
      workers.forEach(w => {
        w.kill(signal);
      });
    });
    return;
  }

  const runtime = createServeRuntime(config);

  if (absSchemaPath) {
    log.info(`Serving supergraph from ${absSchemaPath}`);
  } else {
    log.info('Serving supergraph from config');
  }

  await startServerForRuntime(runtime, {
    ...config,
    log,
  });
}
