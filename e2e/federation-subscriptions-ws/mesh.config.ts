import { defineConfig as defineServeConfig } from '@graphql-mesh/serve-cli';
import { HTTPTransportOptions } from '@graphql-mesh/transport-http';

export const serveConfig = defineServeConfig({
  transports: {
    http: {
      subscriptions: {
        ws: {
          subgraphs: {
            '*': {
              path: '/subscriptions',
            },
          },
        },
      },
    } satisfies HTTPTransportOptions,
  },
});
