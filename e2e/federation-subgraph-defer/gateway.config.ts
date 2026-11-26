import { defineConfig } from '@graphql-hive/gateway';

/**
 * Enable client @defer/@stream and forward `@defer` to subgraphs that support
 * incremental delivery.
 */
export const gatewayConfig = defineConfig({
  deferStream: {
    subgraph: true,
  },
});
