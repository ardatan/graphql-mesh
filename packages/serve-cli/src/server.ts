import { promises as fsPromises } from 'node:fs';
import { createServer as createHTTPServer, type Server } from 'node:http';
import { createServer as createHTTPSServer } from 'node:https';
import type { SecureContextOptions } from 'node:tls';
import type { execute, ExecutionArgs, subscribe } from 'graphql';
import type { GatewayRuntime } from '@graphql-mesh/serve-runtime';
import type { Logger } from '@graphql-mesh/types';
import { createAsyncDisposable, getTerminateStack } from '@graphql-mesh/utils';
import { defaultOptions } from './cli.js';

export interface ServerConfig {
  /**
   * Host to listen on.
   *
   * @default '127.0.0.1' on Windows, otherwise '0.0.0.0'
   */
  host?: string;
  /**
   * Port to listen on.
   *
   * @default 4000
   */
  port?: number;
  /**
   * SSL Credentials for the HTTPS Server.
   *
   * If this is provided, Gateway will be over secure HTTPS instead of unsecure HTTP.
   */
  sslCredentials?: ServerConfigSSLCredentials;
  /**
   * The size of the HTTP headers to allow
   *
   * @default 16384
   */
  maxHeaderSize?: number;
  /**
   * Whether to disable setting up a WebSocket server.
   *
   * @default false
   */
  disableWebsockets?: boolean;
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
  runtime: GatewayRuntime<TContext>,
  {
    log,
    host = defaultOptions.host,
    port = defaultOptions.port,
    sslCredentials,
    maxHeaderSize = 16_384,
    disableWebsockets = false,
  }: ServerForRuntimeOptions,
): Promise<AsyncDisposable> {
  const terminateStack = getTerminateStack();
  terminateStack.use(runtime);
  process.on('message', message => {
    if (message === 'invalidateUnifiedGraph') {
      log.info(`Invalidating Supergraph`);
      runtime.invalidateUnifiedGraph();
    }
  });

  const serverOpts: ServerForRuntimeOptions = {
    log,
    host,
    port,
    sslCredentials,
    maxHeaderSize,
    disableWebsockets,
  };

  let server: AsyncDisposable;

  try {
    server = await startuWebSocketsServer(runtime, serverOpts);
  } catch (e) {
    log.debug(e.message);
    log.warn('uWebSockets.js is not available currently so the server will fallback to node:http.');
    server = await startNodeHttpServer(runtime, serverOpts);
  }

  terminateStack.use(server);

  return server;
}

async function startuWebSocketsServer<TContext>(
  gwRuntime: GatewayRuntime<TContext>,
  opts: ServerForRuntimeOptions,
): Promise<AsyncDisposable> {
  const {
    log,
    host = defaultOptions.host,
    port = defaultOptions.port,
    sslCredentials,
    maxHeaderSize,
    disableWebsockets = false,
  } = opts;
  process.env.UWS_HTTP_MAX_HEADERS_SIZE = maxHeaderSize?.toString();
  // we intentionally use uws.default for CJS/ESM cross compatibility.
  //
  // when importing ESM of uws, the default will be flattened; but when importing
  // CJS, that wont happen - however, the default will always be available
  return import('uWebSockets.js').then(async uWSModule => {
    const uWS = uWSModule.default || uWSModule;
    const protocol = sslCredentials ? 'https' : 'http';
    let app = sslCredentials ? uWS.SSLApp(sslCredentials) : uWS.App();
    app = app.any('/*', gwRuntime);
    const url = `${protocol}://${host}:${port}`.replace('0.0.0.0', 'localhost');
    log.debug(`Starting server on ${url}`);
    if (!disableWebsockets) {
      const graphqlWSOptions = getGraphQLWSOptions(gwRuntime);
      const { makeBehavior } = await import('graphql-ws/lib/use/uWebSockets');
      app = app.ws('/*', makeBehavior(graphqlWSOptions));
    }
    return new Promise((resolve, reject) => {
      app = app.listen(host, port, function listenCallback(listenSocket) {
        if (listenSocket) {
          log.info(`Listening on ${url}`);
          resolve(
            createAsyncDisposable(() => {
              process.stderr.write('\n');
              log.info(`Stopping the server`);
              app.close();
              log.info(`Stopped the server successfully`);
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

async function startNodeHttpServer<TContext>(
  gwRuntime: GatewayRuntime<TContext>,
  opts: ServerForRuntimeOptions,
): Promise<AsyncDisposable> {
  const {
    log,
    host = defaultOptions.host,
    port = defaultOptions.port,
    sslCredentials,
    maxHeaderSize,
    disableWebsockets,
  } = opts;
  let server: Server;
  let protocol: string;

  if (sslCredentials) {
    protocol = 'https';
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
    server = createHTTPSServer(
      {
        ...sslOptionsForNodeHttp,
        maxHeaderSize,
      },
      gwRuntime,
    );
  } else {
    protocol = 'http';
    server = createHTTPServer(
      {
        maxHeaderSize,
      },
      gwRuntime,
    );
  }

  const url = `${protocol}://${host}:${port}`.replace('0.0.0.0', 'localhost');

  log.debug(`Starting server on ${url}`);
  if (!disableWebsockets) {
    const { WebSocketServer } = await import('ws');
    const wsServer = new WebSocketServer({
      path: gwRuntime.graphqlEndpoint,
      server,
    });
    const graphqlWSOptions = getGraphQLWSOptions(gwRuntime);
    const { useServer } = await import('graphql-ws/lib/use/ws');
    useServer(graphqlWSOptions, wsServer);
  }
  return new Promise((resolve, reject) => {
    server = server.once('error', reject).listen(port, host, () => {
      log.info(`Listening on ${url}`);
      resolve(
        createAsyncDisposable(
          () =>
            new Promise<void>(resolve => {
              process.stderr.write('\n');
              log.info(`Stopping the server`);
              server.closeAllConnections();
              server = server.close(() => {
                log.info(`Stopped the server successfully`);
                resolve();
              });
            }),
        ),
      );
    });
  });
}

export function getGraphQLWSOptions<TContext>(gwRuntime: GatewayRuntime<TContext>) {
  // yoga's envelop may augment the `execute` and `subscribe` operations
  // so we need to make sure we always use the freshest instance
  type EnvelopedExecutionArgs = ExecutionArgs & {
    rootValue: {
      execute: typeof execute;
      subscribe: typeof subscribe;
    };
  };
  return {
    execute: (args: EnvelopedExecutionArgs) => args.rootValue.execute(args),
    subscribe: (args: EnvelopedExecutionArgs) => args.rootValue.subscribe(args),
    onSubscribe: async (ctx, msg) => {
      const { schema, execute, subscribe, contextFactory, parse, validate } =
        gwRuntime.getEnveloped({
          connectionParams: ctx.connectionParams,
          req: ctx.extra.request,
        });

      const args: EnvelopedExecutionArgs = {
        schema: schema || (await gwRuntime.getSchema()),
        operationName: msg.payload.operationName,
        document: parse(msg.payload.query),
        variableValues: msg.payload.variables,
        contextValue: await contextFactory(),
        rootValue: {
          execute,
          subscribe,
        },
      };

      if (args.schema) {
        const errors = validate(args.schema, args.document);
        if (errors.length) return errors;
      }
      return args;
    },
    // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  } as Parameters<typeof import('graphql-ws/lib/use/ws.js').useServer>[0];
}
