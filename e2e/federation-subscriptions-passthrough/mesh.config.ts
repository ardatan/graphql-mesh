import { defineConfig } from '@graphql-mesh/serve-cli';
import type { HTTPTransportOptions } from '@graphql-mesh/transport-http';

export const serveConfig = defineConfig({
  transportOptions: {
    '*': {
      http: {
        subscriptions: {
          ws: {
            path: '/subscriptions',
          },
        },
      } satisfies HTTPTransportOptions,
    },
  },
});
