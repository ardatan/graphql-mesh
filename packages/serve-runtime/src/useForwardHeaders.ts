import { MeshServePlugin } from './types';

export interface ForwardHeadersPluginOptions {
  headerNames: string[];
}

export function useForwardHeaders(headerNames: string[]): MeshServePlugin {
  return {
    onFetch({ options, setOptions, context }) {
      const forwardedHeaders: Record<string, string> = {};
      for (const headerName of headerNames) {
        const headerValue = context.headers[headerName];
        if (headerValue) {
          forwardedHeaders[headerName] = headerValue;
        }
      }
      setOptions({
        ...options,
        headers: {
          ...forwardedHeaders,
          ...options.headers,
        },
      });
    },
  };
}
