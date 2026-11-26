import { defineConfig } from '@graphql-hive/gateway';

/**
 * Forward client `@defer` through mesh transforms to the catalog subgraph.
 */
export const gatewayConfig = defineConfig({
  deferStream: {
    subgraph: true,
  },
});
