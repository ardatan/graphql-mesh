import { getInstrumented } from '@envelop/instrumentation';
import type { MeshFetch, OnFetchHook, OnFetchHookDone, OnFetchHookPayload } from '@graphql-mesh/types';
import { handleMaybePromise, iterateAsync } from '@whatwg-node/promise-helpers';

import type { MaybePromise } from '@whatwg-node/promise-helpers';
import { Logger } from '@graphql-hive/logger';

type ExecutionRequest = NonNullable<OnFetchHookPayload<any>['executionRequest']>;

export const requestIdByRequest = new WeakMap<Request, string>();
export const loggerForExecutionRequest = new WeakMap<ExecutionRequest, Logger>();

export type FetchInstrumentation = {
  fetch?: (
    payload: { executionRequest?: ExecutionRequest },
    wrapped: () => MaybePromise<void>,
  ) => MaybePromise<void>;
};

export function wrapFetchWithHooks<TContext>(
  onFetchHooks: OnFetchHook<TContext>[],
  instrumentation?: () => FetchInstrumentation | undefined,
  defaultLogger?: Logger,
): MeshFetch {
  let wrappedFetchFn = function wrappedFetchFn(url, options, context, info) {
    let fetchFn: MeshFetch;
    let response$: MaybePromise<Response>;
    const onFetchDoneHooks: OnFetchHookDone[] = [];
    return handleMaybePromise(
      () =>
        iterateAsync(
          onFetchHooks,
          (onFetch, endEarly) =>
            onFetch({
              fetchFn,
              setFetchFn(newFetchFn) {
                fetchFn = newFetchFn;
              },
              url,
              setURL(newUrl) {
                url = String(newUrl);
              },
              options,
              setOptions(newOptions) {
                options = newOptions;
              },
              context,
              info,
              get executionRequest() {
                return info?.executionRequest;
              },
              get requestId() {
                if (context?.request) {
                  return requestIdByRequest.get(context.request);
                }
              },
              get log() {
                let log: Logger | undefined;
                if (info?.executionRequest) {
                  log = loggerForExecutionRequest.get(info.executionRequest);
                }
                if (!log) {
                  log = defaultLogger?.child('fetch') || new Logger({ prefix: 'fetch' });
                }
                if (context?.request) {
                  const requestId = requestIdByRequest.get(context.request);
                  if (requestId) {
                    log = log.child({ requestId });
                  }
                }
                if (info?.executionRequest) {
                  loggerForExecutionRequest.set(info.executionRequest, log);
                }
                return log;
              },
              endResponse(newResponse) {
                response$ = newResponse;
                endEarly();
              },
            }),
          onFetchDoneHooks,
        ),
      function handleIterationResult() {
        return handleMaybePromise(
          () => response$ || fetchFn(url, options, context, info),
          function (response: Response) {
            return handleMaybePromise(
              () =>
                iterateAsync(onFetchDoneHooks, onFetchDone =>
                  onFetchDone({
                    response,
                    setResponse(newResponse) {
                      response = newResponse;
                    },
                  }),
                ),
              function handleOnFetchDone() {
                return response;
              },
            );
          },
        );
      },
    );
  } as MeshFetch;

  if (instrumentation) {
    const originalWrappedFetch = wrappedFetchFn;
    wrappedFetchFn = function wrappedFetchFn(url, options, context, info) {
      const fetchInstrument = instrumentation()?.fetch;
      const instrumentedFetch = fetchInstrument
        ? getInstrumented({
            get executionRequest() {
              return info?.executionRequest;
            },
          }).asyncFn(fetchInstrument, originalWrappedFetch)
        : originalWrappedFetch;

      return instrumentedFetch(url, options, context, info);
    };
  }

  return wrappedFetchFn;
}
