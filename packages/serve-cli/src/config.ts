/* eslint-disable @typescript-eslint/no-unused-expressions */
import { lstat } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import LocalforageCache from '@graphql-mesh/cache-localforage';
import RedisCache from '@graphql-mesh/cache-redis';
import { include } from '@graphql-mesh/include';
import useJWT from '@graphql-mesh/plugin-jwt-auth';
import { useOpenTelemetry } from '@graphql-mesh/plugin-opentelemetry';
import useMeshPrometheus from '@graphql-mesh/plugin-prometheus';
import useMeshRateLimit from '@graphql-mesh/plugin-rate-limit';
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
  nativeImport: boolean | undefined;
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
        !opts.quiet && opts.log.info(`Found default config file ${configPath}`);
        const module = await include(absoluteConfigPath, opts.nativeImport);
        importedConfig = Object(module).gatewayConfig || null;
        if (!importedConfig) {
          !opts.quiet &&
            opts.log.warn(`No "gatewayConfig" exported from config file at ${configPath}`);
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
    const module = await include(configPath, opts.nativeImport);
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

export function getBuiltinPluginsFromConfig(
  config: GatewayCLIBuiltinPluginConfig,
  ctx: GatewayConfigContext,
) {
  const plugins = [];
  if (config.jwt) {
    plugins.push(useJWT(config.jwt));
  }
  if (config.prometheus) {
    plugins.push(
      useMeshPrometheus({
        ...ctx,
        ...config.prometheus,
      }),
    );
  }
  if (config.openTelemetry) {
    plugins.push(
      useOpenTelemetry({
        ...ctx,
        ...config.openTelemetry,
      }),
    );
  }

  if (config.rateLimiting) {
    plugins.push(
      useMeshRateLimit({
        ...ctx,
        ...config.rateLimiting,
      }),
    );
  }

  return plugins;
}

export function getCacheInstanceFromConfig(
  config: GatewayCLIBuiltinPluginConfig,
  ctx: Pick<GatewayConfigContext, 'logger' | 'pubsub'>,
): KeyValueCache {
  if (config.cache && 'type' in config.cache) {
    switch (config.cache.type) {
      case 'redis':
        return new RedisCache({
          ...ctx,
          ...config.cache,
        });
      case 'cfw-kv':
        return new RedisCache({
          ...ctx,
          ...config.cache,
        });
    }
    if (config.cache.type !== 'localforage') {
      ctx.logger.warn('Unknown cache type, falling back to localforage', config.cache);
    }
    return new LocalforageCache({
      ...ctx,
      ...config.cache,
    });
  }
  if (config.cache) {
    return config.cache as KeyValueCache;
  }
  return new LocalforageCache();
}
