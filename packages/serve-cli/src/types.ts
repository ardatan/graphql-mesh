import type { AppOptions, HttpRequest, HttpResponse } from 'uWebSockets.js';
import type { MeshServeConfig } from '@graphql-mesh/serve-runtime';
import { Logger } from '@graphql-mesh/types';

export interface MeshServeCLIContext {
  req: HttpRequest;
  res: HttpResponse;
}

export type MeshServeCLIConfig = MeshServeConfig<MeshServeCLIContext> & {
  /**
   * Port to listen on (default: `4000`)
   */
  port?: number;
  /**
   * Host to listen on (default: `localhost`)
   */
  host?: string;
  /**
   * SSL Credentials for HTTPS Server
   * If this is provided, Mesh will be served via HTTPS instead of HTTP.
   */
  sslCredentials?: AppOptions;
  /**
   * Path to the browser that will be used by `mesh serve` to open a playground window in development mode
   * This feature can be disabled by passing `false`
   */
  browser?: string | boolean;
};

/**
 * Type helper for defining the config.
 */
export function defineConfig(config: MeshServeCLIConfig) {
  return config;
}

export interface ServerOptions {
  handler: any;
  log: Logger;
  protocol: 'http' | 'https';
  host: string;
  port: number;
  sslCredentials?: MeshServeCLIConfig['sslCredentials'];
}
