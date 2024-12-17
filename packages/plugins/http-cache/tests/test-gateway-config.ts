import { defineConfig, useHttpCache } from '@graphql-hive/gateway';

export const gatewayConfig = defineConfig({
  plugins: ctx => [
    useHttpCache({
      ...ctx,
    }),
  ],
});
