import type { DocumentNode } from 'graphql';
import { print } from 'graphql';
import {
  getDocumentString,
  type DisposableExecutor,
  type Transport,
} from '@graphql-mesh/transport-common';
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
      print: printFnForExecutor,
      ...transportEntry.options,
    });
    const wsOpts = transportEntry.options?.subscriptions?.ws;
    if (wsOpts) {
      const wsExecutorMap = new Map<string, DisposableExecutor>();
      const hostname = /\/\/(.+?)\//.exec(transportEntry.location)[1];
      if (!hostname) {
        throw new Error(`Unable to extract hostname from "${transportEntry.location}"`);
      }
      let protocol = 'ws';
      if (transportEntry.location.startsWith('https')) {
        protocol = 'wss';
      }
      const wsUrl = `${protocol}://${hostname}${wsOpts.path}`;
      const hybridExecutor: DisposableExecutor = function hybridExecutor(request) {
        if (request.operationType === 'subscription') {
          // apollo federation passes the HTTP `Authorization` header through `connectionParams.token`
          // see https://www.apollographql.com/docs/router/executing-operations/subscription-support/#websocket-auth-support
          const token =
            request.context?.headers?.authorization ||
            request.context?.request?.headers?.get('authorization') ||
            undefined;

          // TODO: pass through connection params from the WS connection to the GW (once https://github.com/ardatan/graphql-mesh/issues/7208 lands)

          const hash = wsUrl + token;
          let wsExecutor = wsExecutorMap.get(hash);
          if (!wsExecutor) {
            wsExecutor = buildGraphQLWSExecutor({
              url: wsUrl,
              connectionParams: token ? { token } : undefined,
              retryAttempts: transportEntry.options?.retry,
              lazy: true,
              lazyCloseTimeout: 3_000,
              on: {
                closed() {
                  // no subscriptions and the lazy close timeout has passed - remove the client
                  wsExecutorMap.delete(hash);
                },
              },
              // @ts-expect-error wrong typings for print fn
              print: printFnForExecutor,
            });
            wsExecutorMap.set(hash, wsExecutor);
          }
          return wsExecutor(request);
        }
        return httpExecutor(request);
      };
      hybridExecutor[Symbol.asyncDispose] = () =>
        Promise.all([
          ...Array.from(wsExecutorMap.values()).map(executor => executor[Symbol.asyncDispose]()),
          httpExecutor[Symbol.asyncDispose](),
        ]);
      return hybridExecutor;
    }

    return httpExecutor;
  },
} satisfies Transport<'http', HTTPTransportOptions>;

// Use Envelop's print/parse cache to avoid parsing the same document multiple times
// TODO: Maybe a shared print/parse cache in the future?
function printFnForExecutor(document: DocumentNode) {
  return getDocumentString(document, print);
}
