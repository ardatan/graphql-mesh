import {
  defineConfig,
  type HTTPCallbackTransportOptions,
  type WSTransportOptions,
} from '@graphql-mesh/serve-cli';

export const gatewayConfig = defineConfig({
  webhooks: true,
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
