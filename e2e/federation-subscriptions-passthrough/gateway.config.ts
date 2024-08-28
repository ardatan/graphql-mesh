import { defineConfig } from '@graphql-mesh/serve-cli';
import type { HTTPCallbackTransportOptions } from '@graphql-mesh/transport-http-callback';
import type { WSTransportOptions } from '@graphql-mesh/transport-ws';

export const gatewayConfig = defineConfig({
  webhooks: true,
  maskedErrors: false,
  transportEntries: {
    products: {
      options: {
        subscriptions: {
          kind: 'ws',
          location: '/subscriptions',
          options: {
            connectionParams: {
              token: '{context.headers.authorization}',
            },
          } satisfies WSTransportOptions,
        },
      },
    },
    reviews: {
      options: {
        subscriptions: {
          kind: 'http-callback',
          options: {
            public_url: process.env.PUBLIC_URL,
          } satisfies HTTPCallbackTransportOptions,
        },
      },
    },
  },
});
