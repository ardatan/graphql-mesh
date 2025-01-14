import { defineConfig, useHttpCache } from '@graphql-hive/gateway';

export const gatewayConfig = defineConfig({
  cache: {
    type: 'localforage',
  },
  responseCaching: {
    session: () => null,
  },
  plugins: ctx => [useHttpCache(ctx)],
});
