import {
  createOtlpHttpExporter,
  defineConfig as defineGatewayConfig,
} from '@graphql-mesh/serve-cli';
import type { GatewayPlugin } from '@graphql-mesh/serve-runtime';
import type { MeshFetchRequestInit } from '@graphql-mesh/types';

// The following plugin is used to trace the fetch calls made by Mesh.
const useOnFetchTracer = (): GatewayPlugin => {
  const upstreamCallHeaders: Array<{
    url: string;
    headers: MeshFetchRequestInit['headers'];
  }> = [];

  return {
    onFetch({ url, options }) {
      upstreamCallHeaders.push({ url, headers: options.headers });
    },
    onRequest({ request, url, endResponse, fetchAPI }) {
      if (url.pathname === '/upstream-fetch' && request.method === 'GET') {
        endResponse(fetchAPI.Response.json(upstreamCallHeaders));
        return;
      }
    },
  };
};

export const gatewayConfig = defineGatewayConfig({
  openTelemetry: {
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
  },
  plugins: () => [useOnFetchTracer()],
});
