import { defineConfig, useHttpCache } from '@graphql-hive/gateway';
import useHTTPCache from '@graphql-mesh/plugin-http-cache';

export const gatewayConfig = defineConfig({
  plugins: ctx => [
    useHTTPCache({
      ...ctx,
    }),
  ],
});
