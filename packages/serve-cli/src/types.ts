import type { AppOptions, HttpRequest, HttpResponse } from 'uWebSockets.js';
import type { MeshHTTPHandlerConfiguration } from '@graphql-mesh/serve-runtime';

export interface MeshServeCLIServerContext {
  req: HttpRequest;
  res: HttpResponse;
}

export type MeshServeCLIConfig = MeshHTTPHandlerConfiguration<MeshServeCLIServerContext, {}> & {
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
