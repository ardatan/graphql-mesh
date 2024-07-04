import type { DocumentNode } from 'graphql';
import { print } from 'graphql';
import { createClient as createGraphQLWSClient, type Client as GraphQLWSClient } from 'graphql-ws';
import { WebSocket } from 'ws';
import { getDocumentString } from '@envelop/core';
import type { DisposableExecutor, Transport } from '@graphql-mesh/transport-common';
import { buildGraphQLWSExecutor } from '@graphql-tools/executor-graphql-ws';
import { buildHTTPExecutor, type HTTPExecutorOptions } from '@graphql-tools/executor-http';

export type HTTPTransportOptions = Pick<
  HTTPExecutorOptions,
  'useGETForQueries' | 'method' | 'timeout' | 'credentials' | 'retry'
> & {
  subscriptions?: {
    ws: {
      path: string;
    };
    // TODO: http-callback-based protocol
  };
};

export default {
  getSubgraphExecutor({ transportEntry, fetch }) {
    let headers: Record<string, string> | undefined;
    if (typeof transportEntry.headers === 'string') {
      headers = JSON.parse(transportEntry.headers);
    }
    if (Array.isArray(transportEntry.headers)) {
      headers = Object.fromEntries(transportEntry.headers);
    }

    const httpExecutor = buildHTTPExecutor({
      endpoint: transportEntry.location,
      headers,
      fetch,
      print: printFnForHTTPExecutor,
      ...transportEntry.options,
    });
    let wsConns: { [hash: string]: { client: GraphQLWSClient; executor: DisposableExecutor } } = {};
    const wsOpts = transportEntry.options?.subscriptions?.ws;

    return function HTTPExecutor(request) {
      if (wsOpts && request.operationType === 'subscription') {
        const hostname = /\/\/(.+?)\//.exec(transportEntry.location)[1];
        if (!hostname) {
          throw new Error(`Unable to extract hostname from "${transportEntry.location}"`);
        }

        let protocol = 'ws';
        if (transportEntry.location.startsWith('https')) {
          protocol = 'wss';
        }
        const url = `${protocol}://${hostname}${wsOpts.path}`;

        // apollo federation passes the HTTP `Authorization` header through `connectionParams.token`
        // see https://www.apollographql.com/docs/router/executing-operations/subscription-support/#websocket-auth-support
        const headers = request.context?.request?.headers;
        let token = headers.authorization;
        if (!token && 'get' in headers && typeof headers.get === 'function') {
          // TODO: why do I have to do this for graphql-sse? shouldnt headers be normalised?
          token = headers.get('authorization');
        }
        if (!token) {
          // still no token, maybe it's hard-coded in the config
          token = transportEntry.headers?.find(
            ([key]) => key.toLowerCase() === 'authorization',
          )?.[1];
        }

        // TODO: pass through connection params from the WS connection to the GW (once https://github.com/ardatan/graphql-mesh/issues/7208 lands)

        const hash = url + token;
        let wsConn = wsConns[hash];
        if (!wsConn) {
          const client = createGraphQLWSClient({
            webSocketImpl: WebSocket,
            url: `${protocol}://${hostname}${wsOpts.path}`,
            connectionParams: token ? { token } : undefined,
            retryAttempts: transportEntry.options?.retry,
            lazy: true,
            lazyCloseTimeout: 3_000,
            on: {
              closed() {
                // no subscriptions and the lazy close timeout has passed - remove the client
                delete wsConns[hash];
              },
            },
          });
          wsConn = wsConns[hash] = {
            client,
            executor: buildGraphQLWSExecutor(client),
          };
        }
        wsConn.executor[Symbol.asyncDispose] = async () => {
          if (!Object.keys(wsConn).length) {
            // nothing to dispose or already disposed
            return;
          }
          const disposingWsExecutors = { ...wsConns };
          wsConns = {};
          await Promise.all(
            Object.values(disposingWsExecutors).map(({ client }) => client.dispose()),
          );
        };
        return wsConn.executor(request);
      }

      return httpExecutor(request);
    };
  },
} satisfies Transport<'http', HTTPTransportOptions>;

// Use Envelop's print/parse cache to avoid parsing the same document multiple times
// TODO: Maybe a shared print/parse cache in the future?
function printFnForHTTPExecutor(document: DocumentNode) {
  return getDocumentString(document, print);
}
