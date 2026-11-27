import { GraphQLError, type DocumentNode, type GraphQLResolveInfo } from 'graphql';
import * as hiveSignal from '@graphql-hive/signal';
import {
  copyJson,
  defaultPrintFn,
  serializeExecutionRequest,
  type SerializedExecutionRequest,
  type UpstreamErrorExtensions,
} from '@graphql-tools/executor-common';
import {
  getDefaultIncrementalDeliverySpec,
  getMultipartContentType,
  getOperationASTFromRequest,
  INCREMENTAL_DELIVERY_SPECS,
  isAsyncIterable,
  type DisposableAsyncExecutor,
  type DisposableExecutor,
  type DisposableSyncExecutor,
  type ExecutionRequest,
  type ExecutionResult,
  type Executor,
  type IncrementalSpec,
  type MaybeAsyncIterable,
} from '@graphql-tools/utils';
import { DisposableSymbols } from '@whatwg-node/disposablestack';
import { fetch as defaultFetch } from '@whatwg-node/fetch';
import { handleMaybePromise, isPromise, type MaybePromise } from '@whatwg-node/promise-helpers';
import { createFormDataFromVariables } from './createFormDataFromVariables.js';
import { handleEventStreamResponse } from './handleEventStreamResponse.js';
import { handleMultipartMixedResponse } from './handleMultipartMixedResponse.js';
import { isLiveQueryOperationDefinitionNode } from './isLiveQueryOperationDefinitionNode.js';
import { prepareGETUrl } from './prepareGETUrl.js';
import { createGraphQLErrorForAbort, createResultForAbort, hashSHA256 } from './utils.js';

const { abortSignalAny } = hiveSignal;

/**
 * Soft-call: `@graphql-hive/signal` publishes `disposeAbortSignal` in a later release.
 * Until then this is a no-op so Mesh can ship the cleanup call site now.
 */
function disposeAbortSignal(signal: AbortSignal | undefined): void {
  (
    hiveSignal as typeof hiveSignal & {
      disposeAbortSignal?: (signal: AbortSignal | undefined) => void;
    }
  ).disposeAbortSignal?.(signal);
}

export type SyncFetchFn = (
  url: string,
  init?: RequestInit,
  context?: any,
  info?: GraphQLResolveInfo,
) => SyncResponse;
export type SyncResponse = Omit<Response, 'json' | 'text'> & {
  json: () => any;
  text: () => string;
};

export type AsyncFetchFn = (
  url: string,
  options?: RequestInit,
  context?: any,
  info?: GraphQLResolveInfo,
) => Promise<Response> | Response;

export type RegularFetchFn = (url: string) => Promise<Response> | Response;

export type FetchFn = AsyncFetchFn | SyncFetchFn | RegularFetchFn;

export type AsyncImportFn = (moduleName: string) => PromiseLike<any>;
export type SyncImportFn = (moduleName: string) => any;

export interface HTTPExecutorOptions {
  /**
   * The endpoint to use when querying the upstream API. Can also be a factory function that returns the
   * endpoint based on the `ExecutionRequest` allowing for dynamic endpoints, such as using environment
   * variables or other runtime values.
   * @default '/graphql'
   */
  endpoint?: string | ((executorRequest?: ExecutionRequest) => string);
  /**
   * The WHATWG compatible fetch implementation to use
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
   * @default globalThis.fetch
   */
  fetch?: FetchFn;
  /**
   * Whether to use the GET HTTP method for queries when querying the original schema
   * @default false
   */
  useGETForQueries?: boolean;
  /**
   * Whether to use the GET HTTP method for hashed Automatic Persisted Query requests.
   * Full query fallbacks and mutations continue to use POST.
   * @default false
   */
  useGETForHashedQueries?: boolean;
  /**
   * Whether to set `content-type: application/json` on GET requests when one isn't already provided.
   * This can be useful for compatibility with servers that require a preflighted GET request.
   * @default false
   */
  useContentTypeForGETRequests?: boolean;
  /**
   * Additional headers to include when querying the original schema
   */
  headers?: HeadersConfig | ((executorRequest?: ExecutionRequest) => HeadersConfig);
  /**
   * HTTP method to use when querying the original schema.x
   * @default 'POST'
   */
  method?: 'GET' | 'POST';
  /**
   * Timeout in milliseconds
   */
  timeout?: number | ((request: ExecutionRequest) => number | undefined);
  /**
   * Request Credentials
   * @default 'same-origin'
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Request/credentials
   */
  credentials?: RequestCredentials;
  /**
   * Retry attempts
   */
  retry?: number;
  /**
   * WHATWG compatible `File` implementation
   * @see https://developer.mozilla.org/en-US/docs/Web/API/File
   */
  File?: typeof File;
  /**
   * WHATWG compatible `FormData` implementation
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FormData
   */
  FormData?: typeof FormData;
  /**
   * Print function for `DocumentNode`
   * Useful when you want to memoize the print function or use a different implementation to minify the query etc.
   */
  print?: (doc: DocumentNode) => string;
  /**
   * Enable Automatic Persisted Queries
   * @see https://www.apollographql.com/docs/apollo-server/performance/apq/
   */
  apq?: boolean;
  /**
   * On dispose abort error
   */
  getDisposeReason?(): Error | undefined;
  /**
   * Whether to deduplicate inflight requests with the same parameters.
   * This can be useful to avoid making multiple identical requests to the upstream service when
   * multiple parts of the gateway are requesting the same data at the same time.
   *
   * Requests are deduplicated only within the same executor and the same `context` object,
   * because the `fetch` implementation receives the `context` and may handle each request
   * differently. See `deduplicateInflightRequestsPerContext` to deduplicate across contexts.
   *
   * @default true
   */
  deduplicateInflightRequests?: boolean;
  /**
   * Whether inflight requests are deduplicated only within the same `context` object.
   *
   * When `false`, identical requests are deduplicated across different contexts within the
   * same executor. Use this only when the `fetch` implementation does not handle requests
   * differently based on the `context`, because the `context` of the first request will be
   * used for all deduplicated requests.
   *
   * Hive Gateway's HTTP transport always sets this to `false` so that identical subgraph
   * requests from different clients are deduplicated.
   *
   * @default true
   */
  deduplicateInflightRequestsPerContext?: boolean;

  /**
   * This option allows you to include the response detauls in the result extensions when a request fails.
   * This can be useful for debugging and error handling purposes, as it provides additional context about the response that led to the error.
   * However, be cautious when enabling this option, as response headers may contain sensitive information.
   *
   * @default false
   */
  exposeHTTPDetailsInExtensions?: boolean;

  /**
   * How to deliver `multipart/mixed` incremental (`@defer` / `@stream`) results.
   *
   * - `true` (default): merge each part into a growing snapshot (legacy consumers)
   * - `false`: yield each part as received, matching the default schema executor
   *
   * Hive Gateway's HTTP transport always sets this to `false`.
   *
   * @default true
   */
  mergeIncremental?: boolean;

  /**
   * Force a specific incremental delivery Accept parameter on upstream requests.
   *
   * Mapped through `INCREMENTAL_DELIVERY_SPECS` from `@graphql-tools/utils`:
   * - `'v0.1'` → `multipart/mixed;deferSpec=20220824`
   * - `'v0.2'` → `multipart/mixed;incrementalSpec=v0.2`
   *
   * When omitted (default), send **bare** `multipart/mixed` (no spec parameter)
   * so the subgraph can return whichever format it supports. Also honored from
   * `ExecutionRequest.incrementalSpec` per request.
   *
   * Gateway client responses are negotiated separately by Yoga from the
   * incoming client `Accept` header; this option only affects upstream calls.
   */
  incrementalSpec?: IncrementalSpec;
}

export type HeadersConfig = Record<string, string>;

export interface InflightRequestOptions {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string | FormData;
  credentials?: RequestCredentials;
  signal?: AbortSignal;
}

type InflightRequestId = string;

export function buildHTTPExecutor(
  options?: Omit<HTTPExecutorOptions, 'fetch'> & {
    fetch: SyncFetchFn;
  },
): DisposableSyncExecutor<any, HTTPExecutorOptions>;

export function buildHTTPExecutor(
  options?: Omit<HTTPExecutorOptions, 'fetch'> & {
    fetch: AsyncFetchFn;
  },
): DisposableAsyncExecutor<any, HTTPExecutorOptions>;

export function buildHTTPExecutor(
  options?: Omit<HTTPExecutorOptions, 'fetch'> & {
    fetch: RegularFetchFn;
  },
): DisposableAsyncExecutor<any, HTTPExecutorOptions>;

export function buildHTTPExecutor(
  options?: Omit<HTTPExecutorOptions, 'fetch'>,
): DisposableAsyncExecutor<any, HTTPExecutorOptions>;

export function buildHTTPExecutor(
  options?: HTTPExecutorOptions,
): DisposableExecutor<any, HTTPExecutorOptions> {
  const printFn = options?.print ?? defaultPrintFn;
  /** How many consumers of an inflight request have not taken its result yet. */
  const inflightRequestConsumers = new WeakMap<Promise<ExecutionResult>, number>();
  // inflight requests are scoped per executor and per context because the fetch
  // fn receives the context and may behave differently for each
  const inflightRequestsByContext = new WeakMap<
    object,
    Map<InflightRequestId, Promise<ExecutionResult>>
  >();
  const inflightRequestsWithoutContext = new Map<InflightRequestId, Promise<ExecutionResult>>();
  const abortSignalIds = new WeakMap<AbortSignal, number>();
  let nextAbortSignalId = 0;
  function getAbortSignalId(signal: AbortSignal): number {
    let id = abortSignalIds.get(signal);
    if (id == null) {
      id = ++nextAbortSignalId;
      abortSignalIds.set(signal, id);
    }
    return id;
  }
  let disposeCtrl: AbortController | undefined;
  const executorFetch = options?.fetch ?? defaultFetch;
  const baseExecutor = (
    request: ExecutionRequest<any, any, any, HTTPExecutorOptions>,
    excludeQuery?: boolean,
  ) => {
    // Cloudflare Workers doesn't like the shared AbortController
    if (!request.context?.request?.cf) {
      disposeCtrl ||= new AbortController();
    }
    if (disposeCtrl?.signal.aborted) {
      return createResultForAbort(disposeCtrl.signal.reason);
    }
    const fetchFn = request.extensions?.fetch ?? executorFetch;
    let method = request.extensions?.method || options?.method;

    const operationAst = getOperationASTFromRequest(request);
    const operationType = operationAst.operation;

    if (
      operationType === 'query' &&
      (options?.useGETForQueries ||
        request.extensions?.useGETForQueries ||
        ((options?.useGETForHashedQueries || request.extensions?.useGETForHashedQueries) &&
          excludeQuery))
    ) {
      method = 'GET';
    }

    // Client Accept ↔ gateway response Content-Type is Yoga's job. Upstream
    // defaults to bare multipart/mixed so the subgraph can pick a supported
    // format; set `incrementalSpec` only when a specific format must be forced.
    const incrementalSpec: IncrementalSpec | undefined =
      request.incrementalSpec ?? options?.incrementalSpec;
    const multipartAccept =
      incrementalSpec != null
        ? getMultipartContentType(
            INCREMENTAL_DELIVERY_SPECS.find(s => s.id === incrementalSpec) ??
              getDefaultIncrementalDeliverySpec(INCREMENTAL_DELIVERY_SPECS),
            { echoSpec: true },
          )
        : getMultipartContentType();
    let accept = `application/graphql-response+json, application/json, ${multipartAccept}`;
    let subscriptionCtrl: AbortController | undefined;
    if (operationType === 'subscription' || isLiveQueryOperationDefinitionNode(operationAst)) {
      method ||= 'GET';
      accept = 'text/event-stream';
      subscriptionCtrl = new AbortController();
    } else {
      method ||= 'POST';
    }

    let endpoint: string | undefined;

    if (request.extensions?.endpoint) {
      if (typeof request.extensions.endpoint === 'string') {
        endpoint = request.extensions.endpoint;
      }
      if (typeof request.extensions.endpoint === 'function') {
        endpoint = request.extensions.endpoint(request);
      }
    }
    if (!endpoint) {
      if (typeof options?.endpoint === 'string') {
        endpoint = options.endpoint;
      }
      if (typeof options?.endpoint === 'function') {
        endpoint = options.endpoint(request);
      }
    }
    if (!endpoint) {
      endpoint = '/graphql';
    }

    let isCustomHeader = false;

    const headers: Record<string, any> = { accept };

    if (options?.headers) {
      isCustomHeader = true;
      Object.assign(
        headers,
        typeof options?.headers === 'function' ? options.headers(request) : options?.headers,
      );
    }

    if (request.extensions?.headers) {
      isCustomHeader = true;
      // Keep headers on the original request so APQ fallback / retry still see them.
      Object.assign(headers, request.extensions.headers);
    }

    const signals = [];
    if (disposeCtrl?.signal) {
      signals.push(disposeCtrl.signal);
    }
    const signalFromRequest = request.signal || request.info?.signal;
    if (signalFromRequest) {
      if (signalFromRequest.aborted) {
        return createResultForAbort(signalFromRequest.reason);
      }
      signals.push(signalFromRequest);
    }

    if (options?.timeout) {
      const timeout =
        typeof options.timeout === 'number' ? options.timeout : options.timeout(request);
      if (timeout) {
        signals.push(AbortSignal.timeout(timeout));
      }
    }

    if (subscriptionCtrl) {
      signals.push(subscriptionCtrl.signal);
    }

    const signal = signals.length ? abortSignalAny(signals) : undefined;

    const upstreamErrorExtensions: UpstreamErrorExtensions = {
      request: {
        method,
      },
    };

    const query = printFn(request.document);

    function extensionsForSerialize(extra?: Record<string, any>): Record<string, any> | undefined {
      // Omit headers from the serialized GraphQL payload only; keep them on the
      // original request for fallback and retry.
      const { headers: _headers, ...rest } = {
        ...(request.extensions || {}),
        ...extra,
      };
      return Object.keys(rest).length > 0 ? rest : undefined;
    }

    let serializeFn = function serialize(): MaybePromise<SerializedExecutionRequest> {
      return serializeExecutionRequest({
        executionRequest: {
          ...request,
          extensions: extensionsForSerialize(),
        },
        excludeQuery,
        printFn,
      });
    };

    if (options?.apq) {
      serializeFn = function serializeWithAPQ(): MaybePromise<SerializedExecutionRequest> {
        return handleMaybePromise(
          () => hashSHA256(query),
          sha256Hash =>
            serializeExecutionRequest({
              executionRequest: {
                ...request,
                extensions: extensionsForSerialize({
                  persistedQuery: {
                    version: 1,
                    sha256Hash,
                  },
                }),
              },
              excludeQuery,
              printFn,
            }),
        );
      };
    }

    function handleError(e: any) {
      // Normalize nullish rejection reasons before reading properties.
      if (e == null) {
        e = new Error('Unknown error');
      }
      if (e instanceof GraphQLError) {
        return {
          errors: [e],
        };
      }
      upstreamErrorExtensions.code = 'SUBREQUEST_HTTP_ERROR';
      if (e.name === 'AggregateError') {
        return {
          errors: e.errors.map((err: any) =>
            coerceFetchError(err, {
              signal,
              endpoint,
              upstreamErrorExtensions,
            }),
          ),
        };
      }
      return {
        errors: [
          coerceFetchError(e, {
            signal,
            endpoint,
            upstreamErrorExtensions,
          }),
        ],
      };
    }

    function handleInflightRequest(
      inflightRequestOptions: InflightRequestOptions,
      context?: any,
      info?: GraphQLResolveInfo,
    ): MaybePromise<ExecutionResult> {
      if (
        options?.deduplicateInflightRequests === false ||
        operationType !== 'query' ||
        // Per-request fetch overrides must not share another fetch's response.
        fetchFn !== executorFetch
      ) {
        return runInflightRequest();
      }
      function runInflightRequest() {
        const result$ = handleMaybePromise(
          () =>
            fetchFn(
              inflightRequestOptions.url,
              {
                method: inflightRequestOptions.method,
                headers: inflightRequestOptions.headers,
                body: inflightRequestOptions.body,
                credentials: inflightRequestOptions.credentials,
                signal: inflightRequestOptions.signal,
              },
              context,
              info,
            ) as Promise<Response> | Response,
          (fetchResult: Response) =>
            handleMaybePromise<MaybeAsyncIterable<ExecutionResult> | string, ExecutionResult>(
              () => {
                upstreamErrorExtensions.response ||= {};
                upstreamErrorExtensions.response.status = fetchResult.status;
                upstreamErrorExtensions.response.statusText = fetchResult.statusText;
                if (options?.exposeHTTPDetailsInExtensions) {
                  upstreamErrorExtensions.response.headers = Object.fromEntries(
                    fetchResult.headers.entries(),
                  );
                } else {
                  Object.defineProperty(upstreamErrorExtensions.response, 'headers', {
                    get() {
                      return Object.fromEntries(fetchResult.headers.entries());
                    },
                  });
                }

                // Retry should respect HTTP Errors
                if (options?.retry != null && !fetchResult.status.toString().startsWith('2')) {
                  const statusError = new Error(
                    fetchResult.statusText || `Upstream HTTP Error: ${fetchResult.status}`,
                  );
                  // Release the response body before the next attempt begins.
                  return handleMaybePromise(
                    () =>
                      fetchResult.body?.cancel?.()?.catch(() => undefined) ??
                      fetchResult.arrayBuffer().catch(() => undefined),
                    () => {
                      throw statusError;
                    },
                    () => {
                      throw statusError;
                    },
                  );
                }

                const contentType = fetchResult.headers.get('content-type');
                if (contentType?.includes('text/event-stream')) {
                  return handleEventStreamResponse(fetchResult, subscriptionCtrl, signal);
                } else if (contentType?.includes('multipart/mixed')) {
                  return handleMultipartMixedResponse(fetchResult, {
                    mergeIncremental: options?.mergeIncremental,
                  });
                }

                return fetchResult.text();
              },
              result => {
                if (typeof result === 'string') {
                  upstreamErrorExtensions.response ||= {};
                  upstreamErrorExtensions.response.body = result;
                  if (result) {
                    try {
                      const parsedResult = JSON.parse(result);
                      upstreamErrorExtensions.response.body = parsedResult;
                      if (
                        parsedResult.data == null &&
                        (parsedResult.errors == null || parsedResult.errors.length === 0)
                      ) {
                        const message = `Unexpected empty "data" and "errors" fields in result: ${result}`;
                        upstreamErrorExtensions.code = 'RESPONSE_VALIDATION_FAILED';
                        return {
                          errors: [
                            new GraphQLError(message, {
                              originalError: new Error(message),
                              extensions: upstreamErrorExtensions,
                            }),
                          ],
                        };
                      }
                      if (Array.isArray(parsedResult.errors)) {
                        return {
                          ...parsedResult,
                          errors: parsedResult.errors.map(
                            ({
                              message,
                              ...options
                            }: {
                              message: string;
                              extensions: Record<string, unknown>;
                            }) => new GraphQLError(message, options),
                          ),
                        };
                      }
                      return parsedResult;
                    } catch (e: any) {
                      upstreamErrorExtensions.code = 'RESPONSE_VALIDATION_FAILED';
                      return {
                        errors: [
                          new GraphQLError(`Unexpected response: ${JSON.stringify(result)}`, {
                            extensions: upstreamErrorExtensions,
                            originalError: e,
                          }),
                        ],
                      };
                    }
                  } else {
                    const message = 'No response returned';
                    upstreamErrorExtensions.code = 'RESPONSE_VALIDATION_FAILED';
                    return {
                      errors: [
                        new GraphQLError(message, {
                          extensions: upstreamErrorExtensions,
                          originalError: new Error(message),
                        }),
                      ],
                    };
                  }
                } else {
                  return result;
                }
              },
              handleError,
            ),
          handleError,
        );
        if (options?.exposeHTTPDetailsInExtensions) {
          return handleMaybePromise(
            () => result$,
            result => {
              if (upstreamErrorExtensions.response?.body) {
                upstreamErrorExtensions.response.body = structuredClone(
                  upstreamErrorExtensions.response.body,
                );
              }
              result.extensions ||= {};
              result.extensions = Object.assign(result.extensions, upstreamErrorExtensions);
              return result;
            },
          );
        }
        return result$;
      }
      if (typeof inflightRequestOptions.body === 'object') {
        return runInflightRequest();
      }
      let inflightRequests = inflightRequestsWithoutContext;
      // when per-context dedupe is off, everything shares the executor-wide map
      if (context != null && options?.deduplicateInflightRequestsPerContext !== false) {
        if (Object(context) !== context) {
          // primitives cant be weakmap keys, just dont dedupe
          return runInflightRequest();
        }
        let contextInflightRequests = inflightRequestsByContext.get(context);
        if (!contextInflightRequests) {
          contextInflightRequests = new Map();
          inflightRequestsByContext.set(context, contextInflightRequests);
        }
        inflightRequests = contextInflightRequests;
      }
      let inflightRequestId = `${inflightRequestOptions.url}|${inflightRequestOptions.method}`;
      if (inflightRequestOptions.body) {
        inflightRequestId += `|${inflightRequestOptions.body}`;
      }
      if (isCustomHeader) {
        inflightRequestId += `|${JSON.stringify(inflightRequestOptions.headers)}`;
      }
      // Requests with different abort signals must not share one in-flight fetch,
      // otherwise aborting one consumer cancels the others.
      if (signalFromRequest) {
        inflightRequestId += `|abort:${getAbortSignalId(signalFromRequest)}`;
      }
      let joinedExisting = false;
      let inflightRequest: MaybePromise<ExecutionResult> | undefined =
        inflightRequests.get(inflightRequestId);
      if (inflightRequest) {
        const promise = inflightRequest as Promise<ExecutionResult>;
        inflightRequestConsumers.set(promise, inflightRequestConsumers.get(promise)! + 1);
        joinedExisting = true;
      }
      if (!inflightRequest) {
        inflightRequest = runInflightRequest();
        if (isPromise(inflightRequest)) {
          inflightRequestConsumers.set(inflightRequest, 1);
          inflightRequests.set(inflightRequestId, inflightRequest);
          // Clean up on both fulfillment and rejection without leaving the
          // cleanup chain's rejection unobserved.
          inflightRequest.then(
            () => {
              inflightRequests.delete(inflightRequestId);
            },
            () => {
              inflightRequests.delete(inflightRequestId);
            },
          );
        }
      }
      return handleMaybePromise(
        () => inflightRequest,
        result => {
          if (isAsyncIterable(result)) {
            // Never hand the same stream iterator to multiple callers.
            if (joinedExisting) {
              return runInflightRequest();
            }
            return result;
          }
          const promise = inflightRequest as Promise<ExecutionResult>;
          const consumers = inflightRequestConsumers.get(promise);
          if (consumers == null) {
            return result;
          }
          inflightRequestConsumers.set(promise, consumers - 1);
          // Consumers may change the result; every one gets its own copy. They take the result
          // in the order they came, after the request left the inflight map, so the last one
          // can take the original.
          if (result == null || consumers === 1) {
            return result;
          }
          if (!result.data) {
            return result;
          }
          return {
            ...result,
            data: copyJson(result.data),
          };
        },
      );
    }

    // Once the result is in, the request's signal is done with. A stream still reads with it.
    const releaseSignal = <TResult>(result: TResult): TResult => {
      if (!isAsyncIterable(result)) {
        // It would otherwise keep a listener on the executor's dispose signal until GC, and
        // every request adding one makes adding them slower.
        disposeAbortSignal(signal);
      }
      return result;
    };

    return handleMaybePromise(
      () => serializeFn(),
      (body: SerializedExecutionRequest) => {
        switch (method) {
          case 'GET': {
            if (
              (options?.useContentTypeForGETRequests ||
                request.extensions?.useContentTypeForGETRequests) &&
              !headers['content-type']
            ) {
              headers['content-type'] = 'application/json';
            }
            const finalUrl = prepareGETUrl({
              baseUrl: endpoint,
              body,
            });
            const inflightRequestOptions: InflightRequestOptions = {
              url: finalUrl,
              method: 'GET',
              headers,
              signal,
              credentials: options?.credentials,
            };
            if (options?.exposeHTTPDetailsInExtensions) {
              upstreamErrorExtensions.request.url = finalUrl;
            }
            return handleMaybePromise(
              () => handleInflightRequest(inflightRequestOptions, request.context, request.info),
              releaseSignal,
            );
          }
          case 'POST': {
            if (options?.exposeHTTPDetailsInExtensions) {
              upstreamErrorExtensions.request.body = body;
            }
            return handleMaybePromise(
              () =>
                createFormDataFromVariables(body, {
                  File: options?.File,
                  FormData: options?.FormData,
                }),
              body => {
                if (typeof body === 'string' && !headers['content-type']) {
                  if (options?.exposeHTTPDetailsInExtensions) {
                    upstreamErrorExtensions.request.body = body;
                  }
                  headers['content-type'] = 'application/json';
                }
                const inflightRequestOptions: InflightRequestOptions = {
                  url: endpoint!,
                  method: 'POST',
                  body,
                  headers,
                  credentials: options?.credentials,
                  signal,
                };
                return handleMaybePromise(
                  () =>
                    handleInflightRequest(inflightRequestOptions, request.context, request.info),
                  releaseSignal,
                );
              },
              handleError,
            );
          }
        }
      },
      handleError,
    );
  };

  let executor: Executor = baseExecutor;

  if (options?.apq === true) {
    executor = function apqExecutor(request: ExecutionRequest) {
      return handleMaybePromise(
        () => baseExecutor(request, true),
        (res: ExecutionResult) => {
          if (
            res.errors?.some(
              error =>
                error.extensions.code === 'PERSISTED_QUERY_NOT_FOUND' ||
                error.message === 'PersistedQueryNotFound',
            )
          ) {
            return baseExecutor(request, false);
          }
          return res;
        },
      );
    };
  }

  if (options?.retry != null) {
    const prevExecutor = executor as typeof baseExecutor;
    // retry: 0 still allows the initial attempt; positive values keep the same attempt budget.
    const maxAttempts = Math.max(options.retry, 1);
    executor = function retryExecutor(request: ExecutionRequest) {
      const operationAst = getOperationASTFromRequest(request);
      // Do not replay mutations after ambiguous transport failures.
      if (operationAst.operation === 'mutation') {
        return prevExecutor(request);
      }
      let result: ExecutionResult<any> | undefined;
      let attempt = 0;
      function retryAttempt(): Promise<ExecutionResult<any>> | ExecutionResult<any> {
        if (disposeCtrl?.signal.aborted) {
          return createResultForAbort(disposeCtrl.signal.reason);
        }
        attempt++;
        if (attempt > maxAttempts) {
          if (result != null) {
            return result;
          }
          return {
            errors: [new GraphQLError('No response returned from fetch')],
          };
        }
        return handleMaybePromise(
          () => prevExecutor(request),
          res => {
            result = res;
            if (result?.errors?.length) {
              return retryAttempt();
            }
            return result;
          },
        );
      }
      return retryAttempt();
    };
  }

  // After an operation fully settles, clear an aborted disposeCtrl so a later
  // execute can create a fresh controller. Keep it visible during retries.
  const runExecutor = executor;
  executor = function disposableAwareExecutor(request: ExecutionRequest) {
    return handleMaybePromise(
      () => runExecutor(request),
      result => {
        if (disposeCtrl?.signal.aborted) {
          disposeCtrl = undefined;
        }
        return result;
      },
      err => {
        if (disposeCtrl?.signal.aborted) {
          disposeCtrl = undefined;
        }
        throw err;
      },
    );
  };

  Object.defineProperties(executor, {
    [DisposableSymbols.dispose]: {
      get() {
        return function dispose() {
          // Abort but do not clear yet — pending retry loops must still see it.
          disposeCtrl?.abort(options?.getDisposeReason?.());
        };
      },
    },
    [DisposableSymbols.asyncDispose]: {
      get() {
        return function asyncDispose() {
          disposeCtrl?.abort(options?.getDisposeReason?.());
        };
      },
    },
  });

  return executor as DisposableExecutor<any, HTTPExecutorOptions>;
}

function coerceFetchError(
  e: any,
  {
    signal,
    endpoint,
    upstreamErrorExtensions,
  }: {
    signal?: AbortSignal;
    endpoint?: string;
    upstreamErrorExtensions: UpstreamErrorExtensions;
  },
) {
  if (typeof e === 'string') {
    return new GraphQLError(e, {
      extensions: upstreamErrorExtensions,
    });
  } else if (e.name === 'GraphQLError') {
    return e;
  } else if (e.name === 'TypeError' && e.message === 'fetch failed') {
    return new GraphQLError(`fetch failed to ${endpoint}`, {
      extensions: upstreamErrorExtensions,
      originalError: e,
    });
  } else if (e.name === 'AbortError') {
    return createGraphQLErrorForAbort(signal?.reason || e, upstreamErrorExtensions);
  } else if (e.message) {
    return new GraphQLError(e.message, {
      extensions: upstreamErrorExtensions,
      originalError: e,
    });
  } else {
    return new GraphQLError('Unknown error', {
      extensions: upstreamErrorExtensions,
      originalError: e,
    });
  }
}

export { isLiveQueryOperationDefinitionNode };
