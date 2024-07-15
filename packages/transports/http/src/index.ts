import { getInterpolatedHeadersFactory } from '@graphql-mesh/string-interpolation';
import {
  defaultPrintFn,
  type DisposableExecutor,
  type Transport,
  type TransportEntry,
} from '@graphql-mesh/transport-common';
import { mapMaybePromise } from '@graphql-mesh/utils';
import { buildHTTPExecutor, type HTTPExecutorOptions } from '@graphql-tools/executor-http';

export type HTTPTransportOptions<
  TSubscriptionTransportKind = string,
  TSubscriptionTransportOptions = {},
> = Pick<HTTPExecutorOptions, 'useGETForQueries' | 'method' | 'timeout' | 'credentials' | 'retry'> &
  (TSubscriptionTransportKind extends string
    ? {
        subscriptions?: TransportEntry<TSubscriptionTransportKind, TSubscriptionTransportOptions>;
      }
    : {});

export default {
  getSubgraphExecutor(payload) {
    let headersInConfig: Record<string, string> | undefined;
    if (typeof payload.transportEntry.headers === 'string') {
      headersInConfig = JSON.parse(payload.transportEntry.headers);
    }
    if (Array.isArray(payload.transportEntry.headers)) {
      headersInConfig = Object.fromEntries(payload.transportEntry.headers);
    }

    const headersFactory = getInterpolatedHeadersFactory(headersInConfig);

    const httpExecutor = buildHTTPExecutor({
      endpoint: payload.transportEntry.location,
      headers: execReq =>
        headersFactory({
          env: process.env,
          root: execReq.rootValue,
          context: execReq.context,
          info: execReq.info,
        }),
      fetch,
      print: defaultPrintFn,
      ...payload.transportEntry.options,
    });

    if (payload.transportEntry.options && 'subscriptions' in payload.transportEntry.options) {
      let subscriptionsExecutor = function (execReq) {
        const subscriptionsKind =
          payload.transportEntry.options?.subscriptions?.kind || payload.transportEntry.kind;
        const subscriptionsLocation = payload.transportEntry.options?.subscriptions?.location
          ? new URL(
              payload.transportEntry.options.subscriptions.location,
              payload.transportEntry.location,
            ).toString()
          : payload.transportEntry.location;
        return mapMaybePromise(
          payload.transportExecutorFactoryGetter(subscriptionsKind),
          transportExecutorFactory =>
            mapMaybePromise(
              transportExecutorFactory({
                ...payload,
                transportEntry: {
                  ...payload.transportEntry,
                  kind: subscriptionsKind,
                  location: subscriptionsLocation,
                  options: {
                    ...payload.transportEntry.options,
                    ...payload.transportEntry.options?.subscriptions?.options,
                  },
                },
              }),
              resolvedSubscriptionsExecutor => {
                subscriptionsExecutor = resolvedSubscriptionsExecutor;
                return subscriptionsExecutor(execReq);
              },
            ),
        );
      };
      const hybridExecutor: DisposableExecutor = function hybridExecutor(executionRequest) {
        if (subscriptionsExecutor && executionRequest.operationType === 'subscription') {
          return subscriptionsExecutor(executionRequest);
        }
        return httpExecutor(executionRequest);
      };
      hybridExecutor[Symbol.asyncDispose] = function executorDisposeFn() {
        return Promise.all([
          httpExecutor[Symbol.asyncDispose]?.(),
          subscriptionsExecutor?.[Symbol.asyncDispose]?.(),
        ]);
      };
      return hybridExecutor;
    }

    return httpExecutor;
  },
} satisfies Transport<'http', HTTPTransportOptions>;
