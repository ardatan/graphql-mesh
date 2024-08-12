import cluster, { Worker } from 'node:cluster';
import { lstat } from 'node:fs/promises';
import { dirname, isAbsolute, resolve } from 'node:path';
import { Option } from '@commander-js/extra-typings';
import {
  createServeRuntime,
  type MeshServeConfigSupergraph,
  type MeshServeHiveCDNOptions,
  type UnifiedGraphConfig,
} from '@graphql-mesh/serve-runtime';
import { isUrl, registerTerminateHandler } from '@graphql-mesh/utils';
import { isValidPath } from '@graphql-tools/utils';
import type { AddCommand, CLIContext, CLIGlobals, MeshServeCLIConfig } from '../cli.js';
import { loadConfig } from '../config.js';
import { startServerForRuntime } from '../server.js';

export const addCommand: AddCommand = (ctx, cli) =>
  cli
    .command('supergraph')
    .description(
      'serve a Federation supergraph provided by a compliant composition tool such as Mesh Compose or Apollo Rover',
    )
    .argument(
      '[schemaPathOrUrl]',
      'path to the composed supergraph schema file or a url from where to pull the supergraph schema (default: "supergraph.graphql")',
    )
    .addOption(
      new Option(
        '--hive-cdn-key <key>',
        'Hive CDN API key for fetching the supergraph. implies that the "schemaPathOrUrl" argument is a url',
      ).env('HIVE_CDN_KEY'),
    )
    .action(async function supergraph(schemaPathOrUrl) {
      const { hiveCdnKey, maskedErrors, ...opts } = this.optsWithGlobals<CLIGlobals>();
      const loadedConfig = await loadConfig({
        log: ctx.log,
        configPath: opts.configPath,
        quiet: !cluster.isPrimary,
      });

      let supergraph: UnifiedGraphConfig | MeshServeHiveCDNOptions = 'supergraph.graphql';
      if (schemaPathOrUrl) {
        supergraph = hiveCdnKey
          ? { type: 'hive', endpoint: schemaPathOrUrl, key: hiveCdnKey }
          : schemaPathOrUrl;
      } else if ('supergraph' in loadedConfig) {
        supergraph = loadedConfig.supergraph;
        // TODO: how to provide hive-cdn-key?
      }

      const config: SupergraphConfig = {
        ...loadedConfig,
        ...opts,
        supergraph,
      };
      if (maskedErrors != null) {
        // overwrite masked errors from loaded config only when provided
        config.maskedErrors = maskedErrors;
      }
      return runSupergraph(ctx, config);
    });

export type SupergraphConfig = MeshServeConfigSupergraph<unknown> & MeshServeCLIConfig;

export async function runSupergraph({ log }: CLIContext, config: SupergraphConfig) {
  let absSchemaPath: string | null = null;
  if (
    typeof config.supergraph === 'string' &&
    isValidPath(config.supergraph) &&
    !isUrl(config.supergraph)
  ) {
    const supergraphPath = config.supergraph;
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
    log.info(`Serving local supergraph from ${absSchemaPath}`);
  } else if (isUrl(String(config.supergraph))) {
    log.info(`Serving remote supergraph from ${config.supergraph}`);
  } else if (
    typeof config.supergraph === 'object' &&
    'type' in config.supergraph &&
    config.supergraph.type === 'hive'
  ) {
    log.info(`Serving supergraph from Hive CDN at ${config.supergraph.endpoint}`);
  } else {
    log.info('Serving supergraph from config');
  }

  await startServerForRuntime(runtime, {
    ...config,
    log,
  });
}
