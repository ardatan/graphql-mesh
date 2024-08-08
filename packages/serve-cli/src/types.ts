import type { MeshServeConfig } from '@graphql-mesh/serve-runtime';
import type { ServerConfig } from './server';

export type MeshServeCLIConfig = MeshServeConfig & ServerConfig & { fork: number };

/**
 * Type helper for defining the config.
 */
export function defineConfig(config: MeshServeCLIConfig) {
  return config;
}
