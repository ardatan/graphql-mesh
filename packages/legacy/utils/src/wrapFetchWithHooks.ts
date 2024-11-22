import type { Logger, MeshFetch, OnFetchHook, OnFetchHookDone } from '@graphql-mesh/types';
import { mapMaybePromise, type ExecutionRequest } from '@graphql-tools/utils';
import { iterateAsync } from './iterateAsync.js';
import { DefaultLogger } from './logger.js';

export const requestIdByRequest = new WeakMap<Request, string>();
export const loggerForExecutionRequest = new WeakMap<ExecutionRequest, Logger>();

export function wrapFetchWithHooks<TContext>(onFetchHooks: OnFetchHook<TContext>[]): MeshFetch {
  return function wrappedFetchFn(url, options, context, info) {
    let fetchFn: MeshFetch;
    const onFetchDoneHooks: OnFetchHookDone[] = [];
    return mapMaybePromise(
      iterateAsync(
        onFetchHooks,
        onFetch =>
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
            get logger() {
              let logger: Logger;
              if (info?.executionRequest) {
                logger = loggerForExecutionRequest.get(info.executionRequest);
              }
              if (!logger) {
                logger = new DefaultLogger('fetch');
              }
              if (context?.request) {
                const requestId = requestIdByRequest.get(context.request);
                if (requestId) {
                  logger = logger.child(requestId);
                }
              }
              if (info?.executionRequest) {
                loggerForExecutionRequest.set(info.executionRequest, logger);
              }
              return logger;
            },
          }),
        onFetchDoneHooks,
      ),
      function handleIterationResult() {
        const res$ = fetchFn(url, options, context, info);
        if (onFetchDoneHooks.length === 0) {
          return res$;
        }
        return mapMaybePromise(res$, function (response: Response) {
          return mapMaybePromise(
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
        });
      },
    );
  } as MeshFetch;
}
