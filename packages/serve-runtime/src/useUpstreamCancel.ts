import { MeshServePlugin } from './types';

export function useUpstreamCancel(): MeshServePlugin {
  return {
    onFetch({ context, options, setOptions }) {
      if (context.request) {
        setOptions({
          ...options,
          signal: options.signal
            ? // @ts-expect-error https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/any_static
              AbortSignal.any([options.signal, context.request.signal])
            : context.request.signal,
        });
      }
    },
  };
}
