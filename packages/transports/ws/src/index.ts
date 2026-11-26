import type { Client } from 'graphql-ws';
import { process } from '@graphql-mesh/cross-helpers';
import {
  getInterpolatedHeadersFactory,
  getInterpolatedStringFactory,
} from '@graphql-mesh/string-interpolation';
import { type DisposableExecutor, type Transport } from '@graphql-mesh/transport-common';
import { dispose, isDisposable, makeAsyncDisposable } from '@graphql-mesh/utils';
import { buildGraphQLWSExecutor } from '@graphql-tools/executor-graphql-ws';

function switchProtocols(url: string) {
  if (url.startsWith('https://')) {
    return url.replace('https://', 'wss://');
  }
  if (url.startsWith('http://')) {
    return url.replace('http://', 'ws://');
  }
  return url;
}

export interface WSTransportOptions {
  /**
   * Interpolated additional parameters, passed through the `payload` field with the `ConnectionInit` message,
   * that the client specifies when establishing a connection with the server. You can use this
   * for securely passing arguments for authentication.
   */
  connectionParams?: Record<string, string>;
}

export default {
  getSubgraphExecutor(
    { transportEntry, log: rootLog },
    /**
     * Do not use this option unless you know what you are doing.
     * @internal
     */
    onClient?: (client: Client) => void,
  ) {
    const wsExecutorMap = new Map<string, DisposableExecutor>();
    if (!transportEntry.location) {
      throw new Error('WS Transport: location is required in the transport entry');
    }

    const endpointFactory = transportEntry.location
      ? getInterpolatedStringFactory(transportEntry.location)
      : undefined;
    const connectionParamsFactory = transportEntry.options?.connectionParams
      ? getInterpolatedHeadersFactory(transportEntry.options.connectionParams)
      : undefined;
    const headersFactory = transportEntry.headers
      ? getInterpolatedHeadersFactory(Object.fromEntries(transportEntry.headers))
      : undefined;

    // One executor may own multiple graphql-ws clients (connectionParams
    // variants). Track open sockets so a single client's close does not drop
    // the executor from transport cleanup while others remain active.
    const openSocketsByHash = new Map<string, number>();

    const mergedExecutor: DisposableExecutor = function mergedExecutor(execReq) {
      const factoryContext = {
        env: process.env as Record<string, string>,
        root: execReq.rootValue,
        context: execReq.context,
        info: execReq.info,
      };

      const endpoint = endpointFactory ? endpointFactory(factoryContext) : transportEntry.location!;
      const wsUrl = switchProtocols(endpoint);
      const connectionParams = connectionParamsFactory?.(factoryContext);
      const headers = headersFactory?.(factoryContext);

      const hash = JSON.stringify({ wsUrl, connectionParams, headers });

      let wsExecutor = wsExecutorMap.get(hash);
      if (!wsExecutor) {
        const log = rootLog.child({
          executor: 'GraphQL WS',
          wsUrl,
          connectionParams,
          headers,
        });
        wsExecutor = buildGraphQLWSExecutor({
          headers,
          url: wsUrl,
          lazy: true,
          lazyCloseTimeout: 3_000,
          ...transportEntry.options,
          connectionParams,
          on: {
            connecting(isRetry) {
              log.debug({ isRetry }, 'connecting');
            },
            opened(socket) {
              log.debug({ socket }, 'opened');
              openSocketsByHash.set(hash, (openSocketsByHash.get(hash) ?? 0) + 1);
            },
            connected(socket, payload) {
              log.debug({ socket, payload }, 'connected');
            },
            ping(received, payload) {
              log.debug({ received, payload }, 'ping');
            },
            pong(received, payload) {
              log.debug({ received, payload }, 'pong');
            },
            message(message) {
              log.debug({ message }, 'message');
            },
            closed(event) {
              log.debug({ event }, 'closed');
              const remaining = Math.max(0, (openSocketsByHash.get(hash) ?? 1) - 1);
              if (remaining === 0) {
                openSocketsByHash.delete(hash);
                // Evict only once every client under this executor has closed.
                wsExecutorMap.delete(hash);
              } else {
                openSocketsByHash.set(hash, remaining);
              }
            },
            error(error) {
              log.debug({ error }, 'error');
            },
          },
          onClient,
        });
        wsExecutorMap.set(hash, wsExecutor);
      }
      return wsExecutor(execReq);
    };
    return makeAsyncDisposable(mergedExecutor, () =>
      Promise.all(
        Array.from(wsExecutorMap.values()).map(
          executor => isDisposable(executor) && dispose(executor),
        ),
      ).then(() => {}),
    );
  },
} satisfies Transport<WSTransportOptions>;
