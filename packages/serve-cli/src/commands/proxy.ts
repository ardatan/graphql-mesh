import cluster, { type Worker } from 'node:cluster';
import { createGatewayRuntime, type GatewayConfigProxy } from '@graphql-mesh/serve-runtime';
import { isUrl, registerTerminateHandler } from '@graphql-mesh/utils';
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
    .command('proxy')
    .description(
      'serve a proxy to a GraphQL API and add additional features such as monitoring/tracing, caching, rate limiting, security, and more',
    )
    .argument('[endpoint]', 'URL of the endpoint GraphQL API to proxy')
    .option(
      '--schema <schemaPathOrUrl>',
      'path to the GraphQL schema file or a url from where to pull the schema',
    )
    .action(async function proxy(endpoint) {
      const {
        hiveCdnEndpoint,
        hiveCdnKey,
        hiveRegistryToken,
        maskedErrors,
        polling,
        nativeImport,
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

      let proxy: GatewayConfigProxy['proxy'] | undefined;
      if (endpoint) {
        proxy = { endpoint };
      } else if ('proxy' in loadedConfig) {
        proxy = loadedConfig.proxy;
        // TODO: how to provide hive-cdn-key?
      }
      if (!proxy) {
        ctx.log.error(
          'Proxy endpoint not defined. Please provide it in the [endpoint] argument or in the config file.',
        );
        process.exit(1);
      }

      let schema: GatewayConfigProxy['schema'] | undefined;
      const hiveCdnEndpointOpt = opts.schema || hiveCdnEndpoint;
      if (hiveCdnEndpointOpt) {
        if (hiveCdnKey) {
          if (!isUrl(hiveCdnEndpointOpt)) {
            ctx.log.error(
              'Hive CDN endpoint must be a URL when providing --hive-cdn-key but got ' +
                hiveCdnEndpointOpt,
            );
            process.exit(1);
          }
          schema = {
            type: 'hive',
            endpoint: hiveCdnEndpointOpt, // see validation above
            key: hiveCdnKey,
          };
        } else {
          schema = opts.schema;
        }
      } else if ('schema' in loadedConfig) {
        schema = loadedConfig.schema;
        // TODO: how to provide hive-cdn-key?
      }
      if (hiveCdnKey && !schema) {
        process.stderr.write(
          `error: option '--schema <schemaPathOrUrl>' is required when providing '--hive-cdn-key <key>'\n`,
        );
        process.exit(1);
      }

      const config: ProxyConfig = {
        ...defaultOptions,
        ...loadedConfig,
        ...opts,
        ...(hiveRegistryToken
          ? {
              reporting: {
                ...loadedConfig.reporting,
                type: 'hive',
                token: hiveRegistryToken,
              },
            }
          : {}),
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
        proxy,
        schema,
        logging: loadedConfig.logging ?? ctx.log,
        productName: ctx.productName,
        productDescription: ctx.productDescription,
        productPackageName: ctx.productPackageName,
        productLogo: ctx.productLogo,
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
      return runProxy(ctx, config);
    });

export type ProxyConfig = GatewayConfigProxy<unknown> & GatewayCLIConfig;

export async function runProxy({ log }: CLIContext, config: ProxyConfig) {
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

  log.info(`Proxying requests to ${config.proxy.endpoint}`);

  const runtime = createGatewayRuntime(config);

  await startServerForRuntime(runtime, {
    ...config,
    log,
  });
}
