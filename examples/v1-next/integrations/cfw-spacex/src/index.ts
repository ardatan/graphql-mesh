import { useDepthLimit } from '@envelop/depth-limit';
import { createGatewayRuntime } from '@graphql-hive/gateway-runtime';
import CFWorkerKVCache from '@graphql-mesh/cache-cfw-kv';
import useMeshRateLimit from '@graphql-mesh/plugin-rate-limit';
import useMeshResponseCache from '@graphql-mesh/plugin-response-cache';

self.addEventListener(
  'fetch',
  createGatewayRuntime({
    proxy: {
      endpoint: 'https://main--spacex-l4uc6p.apollographos.net/graphql',
    },
    cache: {
      type: 'cfw-kv',
      namespace: 'MESH',
    },
    plugins: ctx => [
      useDepthLimit({
        maxDepth: 5,
      }),
      useMeshRateLimit({
        ...ctx,
        config: [
          {
            type: 'Query',
            field: '*',
            max: 3,
            ttl: 60000,
            identifier: 'context.headers.host',
          },
        ],
      }),
      useMeshResponseCache({
        ...ctx,
        ttlPerCoordinate: [
          {
            coordinate: 'Query.*',
            ttl: 360000,
          },
        ],
      }),
    ],
  }),
);
