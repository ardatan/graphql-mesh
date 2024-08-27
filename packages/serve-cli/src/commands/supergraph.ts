import cluster, { type Worker } from 'node:cluster';
import { lstat } from 'node:fs/promises';
import { dirname, isAbsolute, resolve } from 'node:path';
import { Option } from '@commander-js/extra-typings';
import {
  createGatewayRuntime,
  type GatewayConfigSupergraph,
  type GatewayGraphOSManagedFederationOptions,
  type GatewayHiveCDNOptions,
  type UnifiedGraphConfig,
} from '@graphql-mesh/serve-runtime';
import { isUrl, registerTerminateHandler } from '@graphql-mesh/utils';
import { isValidPath } from '@graphql-tools/utils';
import {
  defaultOptions,
  type AddCommand,
  type CLIContext,
  type CLIGlobals,
  type GatewayCLIConfig,
} from '../cli.js';
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
        '--apollo-uplink <uplink>',
        'The URL of the managed federation up link. When retrying after a failure, you should cycle through the default up links using this option.',
      ).env('APOLLO_SCHEMA_CONFIG_DELIVERY_ENDPOINT'),
    )
    .action(async function supergraph(schemaPathOrUrl) {
      const {
        hiveCdnEndpoint,
        hiveCdnKey,
        hiveRegistryToken,
        maskedErrors,
        polling,
        nativeImport,
        apolloGraphRef,
        apolloKey,
        apolloUplink,
        hivePersistedDocumentsEndpoint,
        hivePersistedDocumentsToken,
        ...opts
      } = this.optsWithGlobals<CLIGlobals>();
      const loadedConfig = await loadConfig({
        log: ctx.log,
        configPath: opts.configPath,
        quiet: !cluster.isPrimary,
        nativeImport,
        configFileName: ctx.configFileName,
      });

      let supergraph:
        | UnifiedGraphConfig
        | GatewayHiveCDNOptions
        | GatewayGraphOSManagedFederationOptions = 'supergraph.graphql';
      if (schemaPathOrUrl) {
        ctx.log.info(`Found schema path or URL: ${schemaPathOrUrl}`);
        if (hiveCdnKey) {
          ctx.log.info(`Using Hive CDN key`);
          if (!isUrl(schemaPathOrUrl)) {
            ctx.log.error(
              'Hive CDN endpoint must be a URL when providing --hive-cdn-key but got ' +
                schemaPathOrUrl,
            );
            process.exit(1);
          }
          supergraph = { type: 'hive', endpoint: schemaPathOrUrl, key: hiveCdnKey };
        } else if (apolloKey) {
          ctx.log.info(`Using GraphOS API key`);
          if (!schemaPathOrUrl.includes('@')) {
            ctx.log.error(
              `Apollo GraphOS requires a graph ref in the format <graph-id>@<graph-variant> when providing --apollo-key. Please provide a valid graph ref.`,
            );
            process.exit(1);
          }
          supergraph = {
            type: 'graphos',
            apiKey: apolloKey,
            graphRef: schemaPathOrUrl,
            upLink: apolloUplink,
          };
        } else {
          supergraph = schemaPathOrUrl;
        }
      } else if (hiveCdnEndpoint) {
        if (!isUrl(hiveCdnEndpoint)) {
          ctx.log.error(
            `Hive CDN endpoint must be a valid URL but got ${hiveCdnEndpoint}. Please provide a valid URL.`,
          );
          process.exit(1);
        }
        if (!hiveCdnKey) {
          ctx.log.error(
            `Hive CDN requires an API key. Please provide an API key using the --hive-cdn-key option.` +
              `Learn more at https://the-guild.dev/graphql/hive/docs/features/high-availability-cdn#cdn-access-tokens`,
          );
          process.exit(1);
        }
        ctx.log.info(`Using Hive CDN endpoint: ${hiveCdnEndpoint}`);
        supergraph = { type: 'hive', endpoint: hiveCdnEndpoint, key: hiveCdnKey };
      } else if (apolloGraphRef) {
        if (!apolloGraphRef.includes('@')) {
          ctx.log.error(
            `Apollo GraphOS requires a graph ref in the format <graph-id>@<graph-variant>. Please provide a valid graph ref.`,
          );
          process.exit(1);
        }
        if (!apolloKey) {
          ctx.log.error(
            `Apollo GraphOS requires an API key. Please provide an API key using the --apollo-key option.`,
          );
          process.exit(1);
        }
        ctx.log.info(`Using Apollo Graph Ref: ${apolloGraphRef}`);
        supergraph = { type: 'graphos', apiKey: apolloKey, graphRef: apolloGraphRef };
      } else if ('supergraph' in loadedConfig) {
        supergraph = loadedConfig.supergraph;
        // TODO: how to provide hive-cdn-key?
      } else {
        ctx.log.info(`Using default supergraph location: ${supergraph}`);
      }

      let registryConfig: Pick<SupergraphConfig, 'reporting'> = {};

      if (hiveRegistryToken) {
        ctx.log.info(`Configuring Hive registry reporting`);
        registryConfig = {
          reporting: {
            type: 'hive',
            token: hiveRegistryToken,
          },
        };
      } else if (apolloKey) {
        ctx.log.info(`Configuring Apollo GraphOS registry reporting`);
        registryConfig = {
          reporting: {
            type: 'graphos',
            apiKey: apolloKey,
            graphRef: apolloGraphRef,
          },
        };
      }

      const config: SupergraphConfig = {
        ...defaultOptions,
        ...loadedConfig,
        ...opts,
        ...registryConfig,
        ...(polling ? { pollingInterval: polling } : {}),
        ...(hivePersistedDocumentsEndpoint
          ? {
              persistedDocuments: {
                type: 'hive',
                endpoint:
                  hivePersistedDocumentsEndpoint || loadedConfig.persistedDocuments?.endpoint,
                token: hivePersistedDocumentsToken || loadedConfig.persistedDocuments?.token,
              },
            }
          : {}),
        supergraph,
        logging: loadedConfig.logging ?? ctx.log,
        productName: ctx.productName,
        productDescription: ctx.productDescription,
        productPackageName: ctx.productPackageName,
        productLogo: ctx.productLogo,
        productLink: ctx.productLink,
      };
      if (maskedErrors != null) {
        // overwrite masked errors from loaded config only when provided
        config.maskedErrors = maskedErrors;
      }
      if (typeof config.pollingInterval === 'number' && config.pollingInterval < 10_000) {
        process.stderr.write(
          `error: polling interval duration too short, use at least 10 seconds\n`,
        );
        process.exit(1);
      }
      return runSupergraph(ctx, config);
    });

export type SupergraphConfig = GatewayConfigSupergraph<unknown> & GatewayCLIConfig;

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
    log.info(`Reading supergraph from ${absSchemaPath}`);
    try {
      await lstat(absSchemaPath);
    } catch {
      log.error(`Could not read supergraph from ${absSchemaPath}. Make sure the file exists.`);
      process.exit(1);
    }
  }

  if (absSchemaPath && cluster.isPrimary) {
    // eslint-disable-next-line @typescript-eslint/consistent-type-imports
    let watcher: typeof import('@parcel/watcher') | undefined;
    try {
      watcher = await import('@parcel/watcher');
    } catch (e) {
      if (e.code !== 'MODULE_NOT_FOUND') {
        log.debug('Problem while importing @parcel/watcher', e);
      }
      log.warn(
        `If you want to enable hot reloading when ${absSchemaPath} changes, make sure "@parcel/watcher" is available`,
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

  const runtime = createGatewayRuntime(config);

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
