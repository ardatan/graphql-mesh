/* eslint-disable @typescript-eslint/no-unused-expressions */
import { lstat } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import { include } from '@graphql-mesh/include';
import type { GatewayConfig } from '@graphql-mesh/serve-runtime';
import type { Logger } from '@graphql-mesh/types';
import type { ServerConfig } from './server';

export const defaultConfigExtensions = ['.ts', '.mts', '.cts', '.js', '.mjs', '.cjs'];

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
  let importedConfig: Partial<GatewayConfig<TContext> & ServerConfig> | null = null;

  if (!opts.configPath) {
    !opts.quiet && opts.log.info(`Searching for default config files`);
    for (const configPath of createDefaultConfigPaths(opts.configFileName)) {
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
