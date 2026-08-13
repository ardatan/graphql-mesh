import { defineConfig } from '@graphql-hive/gateway';
import useMeshResponseCache from '@graphql-mesh/plugin-response-cache';

export const gatewayConfig = defineConfig({
  plugins: ctx => [
    useMeshResponseCache({
      ...ctx,
      ttl: 60_000,
      includeExtensionMetadata: true,
      // Same shape as #5102 / docs: session keyed by a request header
      sessionId: '{context.headers.test}',
    }),
  ],
});
