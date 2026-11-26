import { process } from '@graphql-mesh/cross-helpers';
import {
  getInterpolatedHeadersFactory,
  getInterpolatedStringFactory,
} from '@graphql-mesh/string-interpolation';
import { type Transport, type TransportEntry } from '@graphql-mesh/transport-common';
import { dispose, isDisposable, makeAsyncDisposable } from '@graphql-mesh/utils';
import { buildHTTPExecutor, type HTTPExecutorOptions } from '@graphql-tools/executor-http';
import type { ExecutionRequest, Executor } from '@graphql-tools/utils';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';

export type HTTPTransportOptions<
  TSubscriptionTransportOptions extends Record<string, any> = Record<string, any>,
> = Pick<
  HTTPExecutorOptions,
  | 'useGETForQueries'
  | 'useGETForHashedQueries'
  | 'useContentTypeForGETRequests'
  | 'method'
  | 'timeout'
  | 'credentials'
  | 'retry'
  | 'apq'
  | 'deduplicateInflightRequests'
> & {
  subscriptions?: TransportEntry<TSubscriptionTransportOptions>;
};

const httpTransport: Transport<HTTPTransportOptions> = {
  getSubgraphExecutor(payload) {
    let headersInConfig: Record<string, string> | undefined;

    if (typeof payload.transportEntry.headers === 'string') {
      headersInConfig = JSON.parse(payload.transportEntry.headers);
    }
    if (Array.isArray(payload.transportEntry.headers)) {
      headersInConfig = Object.fromEntries(payload.transportEntry.headers);
    }

    const headersFactory = headersInConfig
      ? getInterpolatedHeadersFactory(headersInConfig)
      : undefined;

    const endpointFactory = payload.transportEntry.location
      ? getInterpolatedStringFactory(payload.transportEntry.location)
      : undefined;

    // Cross-context dedupe is only safe when fetch ignores request context
    // (arity < 3). Context-aware fetch (auth, etc.) keeps per-context dedupe.
    const fetchFn = payload.fetch as ((...args: any[]) => any) | undefined;
    const fetchIndependentOfContext = fetchFn == null || fetchFn.length < 3;

    const httpExecutor = buildHTTPExecutor({
      endpoint: endpointFactory
        ? execReq =>
            endpointFactory({
              env: process.env as Record<string, string>,
              root: execReq?.rootValue,
              context: execReq?.context,
              info: execReq?.info,
            })
        : payload.transportEntry.location,
      headers: headersFactory
        ? execReq =>
            headersFactory({
              env: process.env as Record<string, string>,
              root: execReq?.rootValue,
              context: execReq?.context,
              info: execReq?.info,
            })
        : undefined,
      ...payload.transportEntry.options,
      // Always pass through multipart patches (like the default schema
      // executor). Must stay after options spread so gateway consumers cannot
      // accidentally re-enable legacy accumulate via transportEntries.
      mergeIncremental: false,
      deduplicateInflightRequestsPerContext: !fetchIndependentOfContext,
      getDisposeReason: payload.getDisposeReason,
      fetch: payload.fetch as any,
    });

    if (
      payload.transportEntry.options &&
      'subscriptions' in payload.transportEntry.options &&
      payload.transportEntry.options.subscriptions != null
    ) {
      let hybridDisposed = false;
      let subscriptionsExecutor: Executor = function (execReq) {
        const subscriptionsKind =
          payload.transportEntry.options?.subscriptions?.kind || payload.transportEntry.kind;
        const subscriptionsLocation = payload.transportEntry.options?.subscriptions?.location
          ? new URL(
              payload.transportEntry.options.subscriptions.location,
              payload.transportEntry.location,
            ).toString()
          : payload.transportEntry.location;
        return handleMaybePromise(
          () =>
            payload.getTransportExecutor({
              ...payload.transportEntry,
              kind: subscriptionsKind,
              headers:
                // WebSocket transport should not have any headers by default,
                // `connectionParams` should be preferred.
                subscriptionsKind === 'ws'
                  ? payload.transportEntry.options?.subscriptions?.headers
                  : (payload.transportEntry.options?.subscriptions?.headers ??
                    payload.transportEntry.headers),
              location: subscriptionsLocation,
              options: {
                ...payload.transportEntry.options,
                ...payload.transportEntry.options?.subscriptions?.options,
                // Make sure to remove subscription option to avoid infinite loop.
                // This option doesn't make sense here but is present in `transportEntry.options`
                subscriptions: undefined,
              },
            }),
          resolvedSubscriptionsExecutor => {
            if (hybridDisposed) {
              if (isDisposable(resolvedSubscriptionsExecutor)) {
                void dispose(resolvedSubscriptionsExecutor);
              }
              throw new Error('HTTP Transport: subscriptions executor resolved after dispose');
            }
            subscriptionsExecutor = resolvedSubscriptionsExecutor;
            return subscriptionsExecutor(execReq);
          },
        );
      };
      return makeAsyncDisposable(
        function hybridExecutor(executionRequest: ExecutionRequest) {
          if (subscriptionsExecutor && executionRequest.operationType === 'subscription') {
            return subscriptionsExecutor(executionRequest);
          }
          return httpExecutor(executionRequest);
        },
        () => {
          hybridDisposed = true;
          return Promise.all([
            dispose(httpExecutor),
            isDisposable(subscriptionsExecutor) && dispose(subscriptionsExecutor),
          ]).then(() => {});
        },
      );
    }

    return httpExecutor;
  },
};

export default httpTransport;
