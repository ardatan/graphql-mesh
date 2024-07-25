import type { Logger, MeshFetch, OnFetchHook, OnFetchHookDone } from '@graphql-mesh/types';
import { type ExecutionRequest } from '@graphql-tools/utils';
import { iterateAsync } from './iterateAsync.js';
import { DefaultLogger } from './logger.js';
import { mapMaybePromise } from './map-maybe-promise.js';

export const requestIdByRequest = new WeakMap<Request, string>();
export const loggerForExecutionRequest = new WeakMap<ExecutionRequest, Logger>();

export function wrapFetchWithHooks<TContext>(onFetchHooks: OnFetchHook<TContext>[]): MeshFetch {
  return function wrappedFetchFn(url, options, context, info) {
    const executionRequest = info?.executionRequest;
    const requestId = context?.request && requestIdByRequest.get(context?.request);
    let logger: Logger = new DefaultLogger('fetch');
    if (requestId) {
      logger = logger.child(requestId);
    }
    if (executionRequest) {
      const execReqLogger = loggerForExecutionRequest.get(executionRequest);
      if (execReqLogger) {
        logger = execReqLogger;
      }
      loggerForExecutionRequest.set(executionRequest, logger);
    }
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
            executionRequest,
            requestId,
            logger,
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
