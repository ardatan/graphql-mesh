import { lstat } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import { include } from '@graphql-mesh/include';
import type { MeshServeConfig } from '@graphql-mesh/serve-runtime';
import type { Logger } from '@graphql-mesh/types';
import type { ServerConfig } from './server';

/** Default config paths sorted by priority. */
export const defaultConfigPaths = [
  'mesh.config.ts',
  'mesh.config.mts',
  'mesh.config.cts',
  'mesh.config.js',
  'mesh.config.mjs',
  'mesh.config.cjs',
];

export async function loadConfig<TContext extends Record<string, any> = Record<string, any>>(opts: {
  quiet?: boolean;
  log: Logger;
  configPath: string | null | undefined;
}) {
  let importedConfig: Partial<MeshServeConfig<TContext> & ServerConfig> | null = null;

  if (!opts.configPath) {
    !opts.quiet && opts.log.info(`Searching for default config files`);
    for (const configPath of defaultConfigPaths) {
      const absoluteConfigPath = resolve(process.cwd(), configPath);
      const exists = await lstat(absoluteConfigPath)
        .then(() => true)
        .catch(() => false);
      if (exists) {
        !opts.quiet && opts.log.info(`Found default config file ${configPath}`);
        const module = await include(absoluteConfigPath);
        importedConfig = Object(module).serveConfig || null;
        if (!importedConfig) {
          !opts.quiet &&
            opts.log.warn(`No "serveConfig" exported from config file at ${configPath}`);
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
    const module = await include(configPath);
    importedConfig = Object(module).serveConfig || null;
    if (!importedConfig) {
      throw new Error(`No "serveConfig" exported from config file at ${configPath}`);
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
