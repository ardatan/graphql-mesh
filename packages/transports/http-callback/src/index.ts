import { GraphQLError, type ExecutionResult } from 'graphql';
import { process } from '@graphql-mesh/cross-helpers';
import {
  getInterpolatedHeadersFactory,
  getInterpolatedStringFactory,
} from '@graphql-mesh/string-interpolation';
import {
  abortSignalAny,
  type DisposableExecutor,
  type Transport,
} from '@graphql-mesh/transport-common';
import { serializeExecutionRequest } from '@graphql-tools/executor-common';
import type { ExecutionRequest } from '@graphql-tools/utils';
import { Repeater, type Push } from '@repeaterjs/repeater';
import { DisposableSymbols } from '@whatwg-node/disposablestack';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';

export interface HTTPCallbackTransportOptions {
  /**
   * The gateway's public URL, which your subgraphs access, must include the path configured on the gateway.
   *
   * @default http://localhost:4000/callback
   */
  public_url?: string;
  /**
   * The path of the router's callback endpoint
   *
   * @default /callback
   */
  path?: string;
  /**
   * @default 5000
   */
  heartbeat_interval?: number;
}

type HTTPCallbackMessage =
  | {
      kind: 'subscription';
      action: 'check';
      id: string;
      verifier: string;
    }
  | {
      kind: 'subscription';
      action: 'next';
      id: string;
      verifier: string;
      payload: ExecutionResult;
    }
  | {
      kind: 'subscription';
      action: 'complete';
      id: string;
      verifier: string;
      errors?: GraphQLError[];
    };

function createTimeoutError() {
  return new GraphQLError('Subscription timed out', {
    extensions: {
      code: 'TIMEOUT_ERROR',
      http: {
        status: 504,
      },
    },
  });
}

export default {
  getSubgraphExecutor({ transportEntry, fetch, pubsub, log: rootLog }): DisposableExecutor {
    let headersInConfig: Record<string, string> | undefined;
    if (typeof transportEntry.headers === 'string') {
      headersInConfig = JSON.parse(transportEntry.headers);
    }
    if (Array.isArray(transportEntry.headers)) {
      headersInConfig = Object.fromEntries(transportEntry.headers);
    }

    const endpointFactory = transportEntry.location
      ? getInterpolatedStringFactory(transportEntry.location)
      : undefined;
    const headersFactory = getInterpolatedHeadersFactory(headersInConfig);

    const verifier = crypto.randomUUID();
    if (!pubsub) {
      throw new Error(`HTTP Callback Transport: You must provide a pubsub instance to http-callbacks transport!
    Example:
      import { PubSub } from '@graphql-hive/gateway'
      export const gatewayConfig = defineConfig({
        pubsub: new PubSub(),
      })
    See documentation: https://graphql-hive.com/docs/gateway/pubsub`);
    }
    const heartbeats = new Map<string, ReturnType<typeof setTimeout>>();
    const stopFnSet = new Set<VoidFunction>();
    const callbackPath = transportEntry.options?.path || '/callback';
    const publicUrl = transportEntry.options?.public_url || 'http://localhost:4000' + callbackPath;
    const heartbeatIntervalMs = transportEntry.options?.heartbeat_interval || 50000;
    const httpCallbackExecutor = function httpCallbackExecutor(executionRequest: ExecutionRequest) {
      const subscriptionId = crypto.randomUUID();
      const log = rootLog.child({
        executor: 'http-callback',
        subscription: subscriptionId,
      });
      // no callbackUrl is without callbackPath because the publicUrl contains it
      const callbackUrl = `${publicUrl}/${subscriptionId}`;
      const subscriptionCallbackPath = `${callbackPath}/${subscriptionId}`;
      const serializedParams = serializeExecutionRequest({
        executionRequest,
      });
      if (!fetch) {
        throw new Error('HTTP Callback Transport: `fetch` implementation is missing!');
      }
      if (!transportEntry.location) {
        throw new Error(`HTTP Callback Transport: \`location\` is missing in the transport entry!`);
      }
      const fetchBody = JSON.stringify({
        ...serializedParams,
        extensions: {
          ...((serializedParams as { extensions?: Record<string, unknown> } | undefined)
            ?.extensions || {}),
          subscription: {
            callbackUrl,
            subscriptionId,
            verifier,
            heartbeatIntervalMs,
          },
        },
      });
      let stopSubscription: (error?: Error) => void = error => {
        if (error) {
          throw error;
        }
      };
      heartbeats.set(
        subscriptionId,
        setTimeout(() => {
          stopSubscription(createTimeoutError());
        }, heartbeatIntervalMs),
      );
      log.debug({ location: transportEntry.location, callbackUrl }, 'Subscribing using callback');
      let pushFn: Push<ExecutionResult> = () => {
        throw new Error(
          'HTTP Callback Transport: Subgraph does not look like configured correctly. Check your subgraph setup.',
        );
      };
      const reqAbortCtrl = new AbortController();
      // Always pass an AbortSignal to fetch (internal + optional request signal).
      const requestSignal = executionRequest.signal || executionRequest.info?.signal;
      const signal = requestSignal
        ? abortSignalAny([reqAbortCtrl.signal, requestSignal])
        : reqAbortCtrl.signal;
      const subFetchCall$ = handleMaybePromise(
        () => {
          const factoryContext = {
            env: process.env as Record<string, string>,
            root: executionRequest.rootValue,
            context: executionRequest.context,
            info: executionRequest.info,
          };

          return fetch(
            endpointFactory ? endpointFactory(factoryContext) : transportEntry.location!,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...headersFactory(factoryContext),
                Accept: 'application/json;callbackSpec=1.0; charset=utf-8',
              },
              body: fetchBody,
              signal,
            },
            executionRequest.context,
            executionRequest.info,
          );
        },
        res =>
          handleMaybePromise(
            () => res.text(),
            resText => {
              let resJson: ExecutionResult;
              try {
                resJson = JSON.parse(resText);
              } catch (e) {
                if (!res.ok) {
                  stopSubscription(
                    new Error(
                      `Subscription request failed with an HTTP Error: ${res.status} ${resText}`,
                    ),
                  );
                } else {
                  stopSubscription(e as Error);
                }
                return;
              }
              log.debug(resJson, 'Subscription request received');
              if (resJson.errors) {
                if (resJson.errors.length === 1 && resJson.errors[0]) {
                  const error = resJson.errors[0];
                  stopSubscription(new GraphQLError(error.message, error));
                } else {
                  stopSubscription(
                    new AggregateError(
                      resJson.errors.map(err => new GraphQLError(err.message, err)),
                      resJson.errors.map(err => err.message).join('\n'),
                    ),
                  );
                }
              } else if (resJson.data != null) {
                pushFn(resJson);
                stopSubscription();
              }
            },
          ),
        e => {
          log.error(e, 'Subscription request failed');
          stopSubscription(e);
        },
      );
      executionRequest.context?.waitUntil?.(subFetchCall$);
      return new Repeater<ExecutionResult>(async (push, stop) => {
        if (signal) {
          if (signal.aborted) {
            stop(signal?.reason);
            return;
          }
          signal.addEventListener(
            'abort',
            () => {
              stop(signal?.reason);
            },
            { once: true },
          );
        }
        pushFn = push;
        stopSubscription = stop;
        stopFnSet.add(stop);
        log.debug(`Listening to ${subscriptionCallbackPath}`);
        const unsubscribe = await pubsub.subscribe(
          `webhook:post:${subscriptionCallbackPath}`,
          (message: HTTPCallbackMessage) => {
            log.debug(message, `Received message from ${subscriptionCallbackPath}`);
            if (message.verifier !== verifier) {
              return;
            }
            const existingHeartbeat = heartbeats.get(subscriptionId);
            if (existingHeartbeat) {
              clearTimeout(existingHeartbeat);
            }
            heartbeats.set(
              subscriptionId,
              setTimeout(() => {
                stopSubscription(createTimeoutError());
              }, heartbeatIntervalMs),
            );
            switch (message.action) {
              case 'check':
                break;
              case 'next':
                push(message.payload);
                break;
              case 'complete':
                if (message.errors) {
                  if (message.errors.length === 1) {
                    stopSubscription(message.errors[0]);
                  } else {
                    stopSubscription(new AggregateError(message.errors));
                  }
                } else {
                  stopSubscription();
                }
                break;
            }
          },
        );
        stop.finally(() => {
          unsubscribe();
          clearTimeout(heartbeats.get(subscriptionId));
          heartbeats.delete(subscriptionId);
          stopFnSet.delete(stop);
          if (!reqAbortCtrl.signal.aborted) {
            reqAbortCtrl.abort();
          }
        });
      });
    };
    function disposeFn() {
      for (const stop of stopFnSet) {
        stop();
      }
      for (const interval of heartbeats.values()) {
        clearTimeout(interval);
      }
    }
    // Avoid `@graphql-mesh/utils` `makeDisposable` (removed on Mesh tip); set
    // the sync dispose symbol directly like other Gateway executors/transports.
    httpCallbackExecutor[DisposableSymbols.dispose] = disposeFn;
    return httpCallbackExecutor;
  },
} satisfies Transport<HTTPCallbackTransportOptions>;
