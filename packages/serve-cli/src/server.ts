import { promises as fsPromises } from 'node:fs';
import { createServer as createHTTPServer } from 'node:http';
import { createServer as createHTTPSServer } from 'node:https';
import type { SecureContextOptions } from 'node:tls';
import type { MeshServeRuntime } from '@graphql-mesh/serve-runtime';
import type { Logger } from '@graphql-mesh/types';
import { createAsyncDisposable, getTerminateStack } from '@graphql-mesh/utils';

export interface ServerConfig {
  /** Host to listen on. */
  host: string;
  /** Port to listen on. */
  port: number;
  /**
   * SSL Credentials for the HTTPS Server.
   *
   * If this is provided, Mesh Serve will be over secure HTTPS instead of unsecure HTTP.
   */
  sslCredentials?: ServerConfigSSLCredentials;
  /**
   * The size of the HTTP headers to allow
   *
   * @default 16384
   */
  maxHeaderSize?: number;
}

export interface ServerConfigSSLCredentials {
  key_file_name?: string;
  cert_file_name?: string;
  ca_file_name?: string;
  passphrase?: string;
  dh_params_file_name?: string;
  ssl_ciphers?: string;
  ssl_prefer_low_memory_usage?: boolean;
}

export interface ServerForRuntimeOptions extends ServerConfig {
  log: Logger;
}

export async function startServerForRuntime<
  TContext extends Record<string, any> = Record<string, any>,
>(
  runtime: MeshServeRuntime<TContext>,
  { log, host, port, sslCredentials, maxHeaderSize = 16_384 }: ServerForRuntimeOptions,
): Promise<AsyncDisposable> {
  const terminateStack = getTerminateStack();
  terminateStack.use(runtime);
  process.on('message', message => {
    if (message === 'invalidateUnifiedGraph') {
      log.info(`Invalidating Supergraph`);
      runtime.invalidateUnifiedGraph();
    }
  });

  let uWebSocketsAvailable = false;
  try {
    await import('uWebSockets.js');
    uWebSocketsAvailable = true;
  } catch (err) {
    log.warn('uWebSockets.js is not available currently so the server will fallback to node:http.');
  }

  const startServer = uWebSocketsAvailable ? startuWebSocketsServer : startNodeHttpServer;
  const server = await startServer(runtime, {
    log,
    host,
    port,
    sslCredentials,
    maxHeaderSize,
  });
  terminateStack.use(server);

  return server;
}

async function startuWebSocketsServer(
  /** TODO: type out */
  handler: any,
  opts: ServerForRuntimeOptions,
): Promise<AsyncDisposable> {
  const { log, host, port, sslCredentials, maxHeaderSize } = opts;
  process.env.UWS_HTTP_MAX_HEADERS_SIZE = maxHeaderSize?.toString();
  return import('uWebSockets.js').then(uWS => {
    const protocol = sslCredentials ? 'https' : 'http';
    const app = sslCredentials ? uWS.SSLApp(sslCredentials) : uWS.App();
    app.any('/*', handler);
    log.info(`Starting server on ${protocol}://${host}:${port}`);
    return new Promise((resolve, reject) => {
      app.listen(host, port, function listenCallback(listenSocket) {
        if (listenSocket) {
          resolve(
            createAsyncDisposable(() => {
              log.info(`Closing ${protocol}://${host}:${port}`);
              app.close();
              return Promise.resolve();
            }),
          );
        } else {
          reject(new Error(`Failed to start server on ${protocol}://${host}:${port}!`));
        }
      });
    });
  });
}

async function startNodeHttpServer(
  /** TODO: type out */
  handler: any,
  opts: ServerForRuntimeOptions,
): Promise<AsyncDisposable> {
  const { log, host, port, sslCredentials, maxHeaderSize } = opts;
  if (sslCredentials) {
    const sslOptionsForNodeHttp: SecureContextOptions = {};
    if (sslCredentials.ca_file_name) {
      sslOptionsForNodeHttp.ca = await fsPromises.readFile(sslCredentials.ca_file_name);
    }
    if (sslCredentials.cert_file_name) {
      sslOptionsForNodeHttp.cert = await fsPromises.readFile(sslCredentials.cert_file_name);
    }
    if (sslCredentials.dh_params_file_name) {
      sslOptionsForNodeHttp.dhparam = await fsPromises.readFile(sslCredentials.dh_params_file_name);
    }
    if (sslCredentials.key_file_name) {
      sslOptionsForNodeHttp.key = await fsPromises.readFile(sslCredentials.key_file_name);
    }
    if (sslCredentials.passphrase) {
      sslOptionsForNodeHttp.passphrase = sslCredentials.passphrase;
    }
    if (sslCredentials.ssl_ciphers) {
      sslOptionsForNodeHttp.ciphers = sslCredentials.ssl_ciphers;
    }
    if (sslCredentials.ssl_prefer_low_memory_usage) {
      sslOptionsForNodeHttp.honorCipherOrder = true;
    }
    const server = createHTTPSServer(sslOptionsForNodeHttp, handler);
    log.info(`Starting server on https://${host}:${port}`);
    return new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, host, () => {
        log.info(`Server started on https://${host}:${port}`);
        resolve(
          createAsyncDisposable(
            () =>
              new Promise<void>(resolve => {
                log.info(`Closing server`);
                server.closeAllConnections();
                server.close(() => {
                  log.info(`Server closed`);
                  resolve();
                });
              }),
          ),
        );
      });
    });
  }

  const server = createHTTPServer(
    {
      maxHeaderSize,
    },
    handler,
  );
  log.info(`Starting server on http://${host}:${port}`);
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      log.info(`Server started on http://${host}:${port}`);
      resolve(
        createAsyncDisposable(
          () =>
            new Promise<void>(resolve => {
              log.info(`Closing server`);
              server.closeAllConnections();
              server.close(() => {
                log.info(`Server closed`);
                resolve();
              });
            }),
        ),
      );
    });
  });
}
