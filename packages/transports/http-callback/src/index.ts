/* eslint-disable @typescript-eslint/no-floating-promises */
import type { ExecutionResult, GraphQLError } from 'graphql';
import { process } from '@graphql-mesh/cross-helpers';
import { getInterpolatedHeadersFactory } from '@graphql-mesh/string-interpolation';
import {
  defaultPrintFn,
  type DisposableExecutor,
  type Transport,
} from '@graphql-mesh/transport-common';
import { makeDisposable, mapMaybePromise } from '@graphql-mesh/utils';
import { createGraphQLError, type ExecutionRequest } from '@graphql-tools/utils';
import { Repeater, type Push } from '@repeaterjs/repeater';
import { crypto } from '@whatwg-node/fetch';

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
  return createGraphQLError('Subscription timed out', {
    extensions: {
      code: 'TIMEOUT_ERROR',
    },
  });
}

export default {
  getSubgraphExecutor({ transportEntry, fetch, pubsub, logger }): DisposableExecutor {
    let headersInConfig: Record<string, string> | undefined;
    if (typeof transportEntry.headers === 'string') {
      headersInConfig = JSON.parse(transportEntry.headers);
    }
    if (Array.isArray(transportEntry.headers)) {
      headersInConfig = Object.fromEntries(transportEntry.headers);
    }

    const headersFactory = getInterpolatedHeadersFactory(headersInConfig);

    const verifier = crypto.randomUUID();
    if (!pubsub) {
      throw new Error(`You must provide a pubsub instance to http-callbacks transport!
    Example:
      export const gatewayConfig = defineConfig({
        pubsub: new PubSub(),
      })
    See documentation: https://the-guild.dev/docs/mesh/pubsub`);
    }
    const reqAbortCtrls = new Set<AbortController>();
    const heartbeats = new Map<string, ReturnType<typeof setTimeout>>();
    const stopFnSet = new Set<VoidFunction>();
    const publicUrl = transportEntry.options?.public_url || 'http://localhost:4000';
    const callbackPath = transportEntry.options?.path || '/callback';
    const heartbeatIntervalMs = transportEntry.options.heartbeat_interval || 50000;
    const httpCallbackExecutor = function httpCallbackExecutor(execReq: ExecutionRequest) {
      const query = defaultPrintFn(execReq.document);
      const subscriptionId = crypto.randomUUID();
      const subscriptionLogger = logger.child(subscriptionId);
      const callbackUrl = `${publicUrl}${callbackPath}/${subscriptionId}`;
      const subscriptionCallbackPath = `${callbackPath}/${subscriptionId}`;
      const fetchBody = JSON.stringify({
        query,
        variables: execReq.variables,
        operationName: execReq.operationName,
        extensions: {
          ...(execReq.extensions || {}),
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
      subscriptionLogger.debug(
        `Subscribing to ${transportEntry.location} with callbackUrl: ${callbackUrl}`,
      );
      let pushFn: Push<ExecutionResult> = () => {
        throw new Error(
          `Subgraph does not look like configured correctly. Check your subgraph setup.`,
        );
      };
      const reqAbortCtrl = new AbortController();
      const subFetchCall$ = mapMaybePromise(
        fetch(
          transportEntry.location,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...headersFactory({
                env: process.env,
                root: execReq.rootValue,
                context: execReq.context,
                info: execReq.info,
              }),
              Accept: 'application/json;callbackSpec=1.0; charset=utf-8',
            },
            body: fetchBody,
            signal: reqAbortCtrl.signal,
          },
          execReq.context,
          execReq.info,
        ),
        res =>
          mapMaybePromise(res.text(), resText => {
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
                stopSubscription(e);
              }
              return;
            }
            logger.debug(`Subscription request received`, resJson);
            if (resJson.errors) {
              if (resJson.errors.length === 1) {
                stopSubscription(createGraphQLError(resJson.errors[0].message, resJson.errors[0]));
              } else {
                stopSubscription(
                  new AggregateError(
                    resJson.errors.map(err => createGraphQLError(err.message, err)),
                    resJson.errors.map(err => err.message).join('\n'),
                  ),
                );
              }
            } else if (resJson.data != null) {
              pushFn(resJson.data);
              stopSubscription();
            }
          }),
        e => {
          logger.debug(`Subscription request failed`, e);
          stopSubscription(e);
        },
      );
      execReq.context?.waitUntil?.(subFetchCall$);
      return new Repeater<ExecutionResult>((push, stop) => {
        pushFn = push;
        stopSubscription = stop;
        stopFnSet.add(stop);
        logger.debug(`Listening to ${subscriptionCallbackPath}`);
        const subId = pubsub.subscribe(
          `webhook:post:${subscriptionCallbackPath}`,
          (message: HTTPCallbackMessage) => {
            logger.debug(`Received message from ${subscriptionCallbackPath}`, message);
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
                    const error = message.errors[0];
                    stopSubscription(
                      createGraphQLError(error.message, {
                        ...error,
                        extensions: {
                          ...error.extensions,
                          code: 'DOWNSTREAM_SERVICE_ERROR',
                        },
                      }),
                    );
                  } else {
                    stopSubscription(
                      new AggregateError(
                        message.errors.map(err =>
                          createGraphQLError(err.message, {
                            ...err,
                            extensions: {
                              ...err.extensions,
                              code: 'DOWNSTREAM_SERVICE_ERROR',
                            },
                          }),
                        ),
                      ),
                    );
                  }
                } else {
                  stopSubscription();
                }
                break;
            }
          },
        );
        stop.finally(() => {
          pubsub.unsubscribe(subId);
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
      for (const ctrl of reqAbortCtrls) {
        if (!ctrl.signal.aborted) {
          ctrl.abort();
        }
      }
    }
    return makeDisposable(httpCallbackExecutor, disposeFn);
  },
} satisfies Transport<HTTPCallbackTransportOptions>;
