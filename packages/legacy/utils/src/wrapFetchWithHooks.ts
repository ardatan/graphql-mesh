import { MeshFetch, OnFetchHook, OnFetchHookDone } from '@graphql-mesh/types';
import { isPromise } from '@graphql-tools/utils';
import { iterateAsync } from './iterateAsync.js';
import { mapMaybePromise } from './map-maybe-promise.js';

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
