import type { GatewayPlugin } from '../types.js';

export function useUpstreamCancel(): GatewayPlugin {
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
