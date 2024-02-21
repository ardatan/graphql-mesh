import { MeshFetch, OnFetchHook, OnFetchHookDone } from '@graphql-mesh/types';
import { isPromise } from '@graphql-tools/utils';
import { iterateAsync } from './iterateAsync.js';

export function wrapFetchWithHooks<TContext>(onFetchHooks: OnFetchHook<TContext>[]): MeshFetch {
  return function wrappedFetchFn(url, options, context, info) {
    let fetchFn: MeshFetch;
    const doneHooks: OnFetchHookDone[] = [];
    function setFetchFn(newFetchFn: MeshFetch) {
      fetchFn = newFetchFn;
    }
    const result$ = iterateAsync(
      onFetchHooks,
      onFetch =>
        onFetch({
          fetchFn,
          setFetchFn,
          url,
          options,
          context,
          info,
        }),
      doneHooks,
    );
    function handleIterationResult() {
      const response$ = fetchFn(url, options, context, info);
      if (doneHooks.length === 0) {
        return response$;
      }
      if (isPromise(response$)) {
        return response$.then(response => handleOnFetchDone(response, doneHooks));
      }
      return handleOnFetchDone(response$, doneHooks);
    }
    if (isPromise(result$)) {
      return result$.then(handleIterationResult);
    }
    return handleIterationResult();
  } as MeshFetch;
}

function handleOnFetchDone(response: Response, onFetchDoneHooks: OnFetchHookDone[]) {
  function setResponse(newResponse: Response) {
    response = newResponse;
  }
  const result$ = iterateAsync(onFetchDoneHooks, onFetchDone =>
    onFetchDone({
      response,
      setResponse,
    }),
  );
  if (isPromise(result$)) {
    return result$.then(() => response);
  }
  return response;
}
