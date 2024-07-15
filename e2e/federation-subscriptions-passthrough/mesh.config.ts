import { defineConfig, PubSub, useWebhooks } from '@graphql-mesh/serve-cli';
import type { WSTransportOptions } from '@graphql-mesh/transport-ws';

export const serveConfig = defineConfig({
  pubsub: new PubSub(),
  plugins: ctx => [useWebhooks(ctx)],
  maskedErrors: false,
  transportOptions: {
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
        },
      },
    },
  },
});
