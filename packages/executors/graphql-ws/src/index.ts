import type { DocumentNode } from 'graphql';
import {
  createClient,
  type Client,
  type EventClosedListener,
  type EventConnectedListener,
  type EventConnectingListener,
  type EventErrorListener,
  type EventMessageListener,
  type EventOpenedListener,
  type EventPingListener,
  type EventPongListener,
} from 'graphql-ws';
import { WebSocket } from 'isows';
import { defaultPrintFn, serializeExecutionRequest } from '@graphql-tools/executor-common';
import {
  getOperationASTFromRequest,
  type DisposableAsyncExecutor,
  type ExecutionRequest,
} from '@graphql-tools/utils';
import { DisposableSymbols } from '@whatwg-node/disposablestack';
import { isBrowser } from './env.js';

export interface GraphQLWSExecutorOptions {
  print?(doc: DocumentNode): string;
  /** The URL of the WebSocket server to connect to. */
  url: string;
  /**
   * Additional headers to include with the upgrade request.
   * It will never be sent again during the lifecycle of the socket.
   *
   * Warning: This is a noop in browser environments
   */
  headers?: Record<string, string>;
  /**
   * Custom WebSocket implementation (passed through to `graphql-ws`).
   * Useful for tests or non-standard runtimes.
   */
  webSocketImpl?: unknown;
  /**
   * Optional parameters, passed through the `payload` field with the `ConnectionInit` message,
   * that the client specifies when establishing a connection with the server. You can use this
   * for securely passing arguments for authentication.
   */
  connectionParams?: Record<string, unknown> | (() => Record<string, unknown>);
  /**
   * How to establish the connection to the server, on-demand or eagerly.
   *
   * @default true
   */
  lazy?: boolean;
  /**
   * How long should the client wait before closing the socket after the last operation has
   * completed. This is meant to be used in combination with `lazy`. You might want to have
   * a calmdown time before actually closing the connection. Kinda' like a lazy close "debounce".
   *
   * @default 0
   */
  lazyCloseTimeout?: number;

  /**
   * Do not use this option unless you know what you are doing.
   * @internal
   */
  on?:
    | Partial<{
        error: EventErrorListener;
        message: EventMessageListener;
        connecting: EventConnectingListener;
        opened: EventOpenedListener;
        connected: EventConnectedListener;
        ping: EventPingListener;
        pong: EventPongListener;
        closed: EventClosedListener;
      }>
    | undefined;

  /**
   * Do not use this option unless you know what you are doing.
   * @internal
   */
  onClient?: (client: Client) => void;
}

function isClient(client: Client | GraphQLWSExecutorOptions): client is Client {
  // graphql-ws Client exposes iterate/subscribe; options always have `url`.
  return 'iterate' in client || 'subscribe' in client;
}

const MAX_CLIENTS_BY_CONNECTION_PARAMS = 16;

function snapshotConnectionParams(params: Record<string, unknown>): Record<string, unknown> {
  try {
    return structuredClone(params);
  } catch {
    return JSON.parse(JSON.stringify(params)) as Record<string, unknown>;
  }
}

export function buildGraphQLWSExecutor(
  clientOptionsOrClient: GraphQLWSExecutorOptions | Client,
): DisposableAsyncExecutor {
  let graphqlWSClient: Client;
  // per-execution connectionParams get their own client so callers never share an authenticated socket
  const clientsByConnectionParams = new Map<string, Client>();
  const activeOpsByClient = new Map<Client, number>();
  let getClient = (_extensionsConnectionParams?: Record<string, unknown>) => graphqlWSClient;
  let printFn = defaultPrintFn;

  function trackClientOp(client: Client) {
    activeOpsByClient.set(client, (activeOpsByClient.get(client) || 0) + 1);
  }

  function releaseClientOp(client: Client) {
    const remaining = (activeOpsByClient.get(client) || 1) - 1;
    if (remaining <= 0) {
      activeOpsByClient.delete(client);
    } else {
      activeOpsByClient.set(client, remaining);
    }
  }

  function evictInactiveClientsIfNeeded() {
    while (clientsByConnectionParams.size >= MAX_CLIENTS_BY_CONNECTION_PARAMS) {
      let evicted = false;
      for (const [key, client] of clientsByConnectionParams) {
        if (!activeOpsByClient.has(client)) {
          clientsByConnectionParams.delete(key);
          void client.dispose();
          evicted = true;
          break;
        }
      }
      if (!evicted) {
        // All retained clients still have active operations.
        break;
      }
    }
  }

  if (isClient(clientOptionsOrClient)) {
    graphqlWSClient = clientOptionsOrClient;
  } else {
    if (clientOptionsOrClient.print) {
      printFn = clientOptionsOrClient.print;
    }

    const headers = clientOptionsOrClient.headers;
    const webSocketImpl =
      clientOptionsOrClient.webSocketImpl ??
      (headers
        ? class WebSocketWithHeaders extends WebSocket {
            constructor(url: string, protocol: string) {
              if (isBrowser()) {
                // browser
                super(url, protocol);
              } else {
                super(url, {
                  // we pass both protocols and protocol to satisfy different implementations
                  // @ts-expect-error rest of environments supporting native WebSocket (Deno, Bun, Node 22+)
                  protocols: [protocol],
                  protocol,
                  headers,
                });
              }
            }
          }
        : WebSocket);

    const clientOptions = clientOptionsOrClient;
    const createWSClient = (extensionsConnectionParams?: Record<string, unknown>) => {
      // Snapshot nested connectionParams so later caller mutations cannot change reconnect payload.
      const extensionsSnapshot = extensionsConnectionParams
        ? snapshotConnectionParams(extensionsConnectionParams)
        : undefined;
      const client = createClient({
        url: clientOptions.url,
        webSocketImpl,
        lazy: clientOptions.lazy !== false,
        lazyCloseTimeout: clientOptions.lazyCloseTimeout || 0,
        connectionParams: () => ({
          ...(typeof clientOptions.connectionParams === 'function'
            ? clientOptions.connectionParams()
            : clientOptions.connectionParams),
          ...extensionsSnapshot,
        }),
        on: clientOptions.on,
      });
      if (clientOptions.onClient) {
        clientOptions.onClient(client);
      }
      return client;
    };
    graphqlWSClient = createWSClient();
    getClient = extensionsConnectionParams => {
      if (!extensionsConnectionParams) {
        return graphqlWSClient;
      }
      const key = JSON.stringify(extensionsConnectionParams);
      let client = clientsByConnectionParams.get(key);
      if (!client) {
        evictInactiveClientsIfNeeded();
        client = createWSClient(extensionsConnectionParams);
        clientsByConnectionParams.set(key, client);
      }
      return client;
    };
  }
  const executor = function GraphQLWSExecutor<
    TData,
    TArgs extends Record<string, any>,
    TRoot,
    TExtensions extends Record<string, any>,
  >(executionRequest: ExecutionRequest<TArgs, any, TRoot, TExtensions>) {
    const {
      extensions,
      operationType = getOperationASTFromRequest(executionRequest).operation,
      info,
      signal = info?.signal,
    } = executionRequest;
    // additional connection params can be supplied through the "connectionParams" field in extensions.
    // TODO: connection params only from the FIRST operation in lazy mode will be used (detect connectionParams changes and reconnect, too implicit?)
    const extensionsConnectionParams =
      extensions?.connectionParams && typeof extensions?.connectionParams === 'object'
        ? extensions.connectionParams
        : undefined;
    const client = getClient(extensionsConnectionParams);
    const iterableIterator = client.iterate<TData, TExtensions>(
      serializeExecutionRequest({ executionRequest, printFn }),
    );
    trackClientOp(client);
    let released = false;
    const release = () => {
      if (!released) {
        released = true;
        releaseClientOp(client);
      }
    };
    // Already-aborted signals never fire 'abort' again — cancel before consumers iterate.
    if (signal?.aborted) {
      void iterableIterator.return?.();
      release();
    } else if (iterableIterator.return && signal) {
      signal.addEventListener(
        'abort',
        () => {
          iterableIterator.return?.();
          release();
        },
        { once: true },
      );
    }
    if (operationType === 'subscription') {
      return {
        [Symbol.asyncIterator]() {
          return this;
        },
        async next() {
          const result = await iterableIterator.next();
          if (result.done) {
            release();
          }
          return result;
        },
        async return() {
          release();
          return iterableIterator.return?.() ?? { value: undefined, done: true };
        },
        async throw(err?: any) {
          release();
          return iterableIterator.throw?.(err) ?? { value: undefined, done: true };
        },
      } as AsyncIterableIterator<any>;
    }
    return iterableIterator.next().then(
      ({ value }) => {
        release();
        return value;
      },
      err => {
        release();
        throw err;
      },
    );
  };
  Object.defineProperty(executor, DisposableSymbols.asyncDispose, {
    value: function disposeWS() {
      const clients = [graphqlWSClient, ...clientsByConnectionParams.values()];
      clientsByConnectionParams.clear();
      activeOpsByClient.clear();
      return Promise.all(clients.map(client => client.dispose())).then(() => {});
    },
  });
  return executor as DisposableAsyncExecutor;
}
