/* eslint-disable @typescript-eslint/no-unused-expressions */
import { lstat } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import type { GatewayConfig, GatewayConfigContext } from '@graphql-mesh/serve-runtime';
import type { KeyValueCache, Logger } from '@graphql-mesh/types';
import type { GatewayCLIBuiltinPluginConfig } from './cli';
import type { ServerConfig } from './server';

export const defaultConfigExtensions = ['.ts', '.mts', '.cts', '.js', '.mjs', '.cjs'];

export const defaultConfigFileName = 'gateway.config';

export function createDefaultConfigPaths(configFileName: string) {
  return defaultConfigExtensions.map(ext => `${configFileName}${ext}`);
}

export async function loadConfig<TContext extends Record<string, any> = Record<string, any>>(opts: {
  quiet?: boolean;
  log: Logger;
  configPath: string | null | undefined;
  configFileName: string;
}) {
  let importedConfig: Partial<
    GatewayConfig<TContext> & ServerConfig & GatewayCLIBuiltinPluginConfig
  > | null = null;

  if (!opts.configPath) {
    !opts.quiet && opts.log.info(`Searching for default config files`);
    const configPaths = [
      ...createDefaultConfigPaths(defaultConfigFileName),
      ...createDefaultConfigPaths(opts.configFileName),
    ];
    for (const configPath of configPaths) {
      const absoluteConfigPath = resolve(process.cwd(), configPath);
      const exists = await lstat(absoluteConfigPath)
        .then(() => true)
        .catch(() => false);
      if (exists) {
        !opts.quiet && opts.log.info(`Found default config file ${absoluteConfigPath}`);
        const module = await import(absoluteConfigPath);
        importedConfig = Object(module).gatewayConfig || null;
        if (!importedConfig) {
          !opts.quiet &&
            opts.log.warn(`No "gatewayConfig" exported from config file at ${absoluteConfigPath}`);
        }
        break;
      }
    }
  } else {
    // using user-provided config
    const configPath = isAbsolute(opts.configPath)
      ? opts.configPath
      : resolve(process.cwd(), opts.configPath);
    !opts.quiet && opts.log.info(`Loading config file at path ${configPath}`);
    const exists = await lstat(configPath)
      .then(() => true)
      .catch(() => false);
    if (!exists) {
      throw new Error(`Cannot find config file at ${configPath}`);
    }
    const module = await import(configPath);
    importedConfig = Object(module).gatewayConfig || null;
    if (!importedConfig) {
      throw new Error(`No "gatewayConfig" exported from config file at ${configPath}`);
    }
  }
  if (importedConfig) {
    !opts.quiet && opts.log.info('Loaded config');
  } else {
    !opts.quiet && opts.log.info('No config loaded');
  }

  // TODO: validate imported config

  return importedConfig || {};
}

export async function getBuiltinPluginsFromConfig(
  config: GatewayCLIBuiltinPluginConfig,
  ctx: { cache: KeyValueCache },
) {
  const plugins = [];
  if (config.jwt) {
    const { useJWT } = await import('@graphql-mesh/plugin-jwt-auth');
    plugins.push(useJWT(config.jwt));
  }
  if (config.prometheus) {
    const { default: useMeshPrometheus } = await import('@graphql-mesh/plugin-prometheus');
    plugins.push(useMeshPrometheus(config.prometheus));
  }
  if (config.openTelemetry) {
    const { useOpenTelemetry } = await import('@graphql-mesh/plugin-opentelemetry');
    plugins.push(useOpenTelemetry(config.openTelemetry));
  }

  if (config.rateLimiting) {
    const { default: useMeshRateLimit } = await import('@graphql-mesh/plugin-rate-limit');
    plugins.push(
      useMeshRateLimit({
        cache: ctx.cache,
        ...config.rateLimiting,
      }),
    );
  }

  return plugins;
}

export async function getCacheInstanceFromConfig(
  config: GatewayCLIBuiltinPluginConfig,
  ctx: Pick<GatewayConfigContext, 'logger' | 'pubsub'>,
): Promise<KeyValueCache> {
  if (config.cache && 'type' in config.cache) {
    switch (config.cache.type) {
      case 'redis': {
        const { default: RedisCache } = await import('@graphql-mesh/cache-redis');
        return new RedisCache({
          ...ctx,
          ...config.cache,
        });
      }
      case 'cfw-kv': {
        const { default: CloudflareKVCacheStorage } = await import('@graphql-mesh/cache-cfw-kv');
        return new CloudflareKVCacheStorage({
          ...ctx,
          ...config.cache,
        });
      }
    }
    if (config.cache.type !== 'localforage') {
      ctx.logger.warn('Unknown cache type, falling back to localforage', config.cache);
    }
    const { default: LocalforageCache } = await import('@graphql-mesh/cache-localforage');
    return new LocalforageCache({
      ...ctx,
      ...config.cache,
    });
  }
  if (config.cache) {
    return config.cache as KeyValueCache;
  }
  const { default: LocalforageCache } = await import('@graphql-mesh/cache-localforage');
  return new LocalforageCache();
}
