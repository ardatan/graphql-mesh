import { MeshServePlugin } from './types';

export interface ForwardHeadersPluginOptions {
  headerNames: string[];
}

export function useForwardHeaders(opts: ForwardHeadersPluginOptions): MeshServePlugin {
  return {
    onFetch({ options, setOptions, context }) {
      const headers = {
        ...options.headers,
      };
      for (const headerName of opts.headerNames) {
        const headerValue = context.headers[headerName];
        if (headerValue) {
          headers[headerName] = headerValue;
        }
      }
      setOptions({
        ...options,
        headers,
      });
    },
  };
}
