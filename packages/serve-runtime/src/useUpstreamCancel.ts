import type { MeshServePlugin } from './types.js';

export function useUpstreamCancel(): MeshServePlugin {
  return {
    onFetch({ context, options }) {
      if (context.request) {
        options.signal = options.signal
          ? AbortSignal.any([options.signal, context.request.signal])
          : context.request.signal;
      }
    },
  };
}
