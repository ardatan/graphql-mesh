import {
  createOtlpHttpExporter,
  createStdoutExporter,
  useOpenTelemetry,
} from '@graphql-mesh/plugin-opentelemetry';
import { defineConfig as defineServeConfig } from '@graphql-mesh/serve-cli';
import type { MeshServePlugin } from '@graphql-mesh/serve-runtime';
import type { MeshFetchRequestInit } from '@graphql-mesh/types';

// The following plugin is used to trace the fetch calls made by Mesh.
const useOnFetchTracer = (): MeshServePlugin => {
  const upstreamCallHeaders: Array<{
    url: string;
    headers: MeshFetchRequestInit['headers'];
  }> = [];

  return {
    onFetch: async ({ url, options }) => {
      upstreamCallHeaders.push({ url, headers: options.headers });
    },
    onRequest: async ({ request, url, endResponse }) => {
      if (url.pathname === '/upstream-fetch' && request.method === 'GET') {
        return endResponse(Response.json(upstreamCallHeaders));
      }
    },
  };
};

export const serveConfig = defineServeConfig({
  plugins: () => [
    useOpenTelemetry({
      exporters: [
        createOtlpHttpExporter(
          {
            url: process.env.OTLP_EXPORTER_URL,
          },
          // Batching config is set in order to make it easier to test.
          {
            scheduledDelayMillis: 1,
          },
        ),
      ],
      serviceName: process.env.OTLP_SERVICE_NAME,
    }),
    useOnFetchTracer(),
  ],
});
