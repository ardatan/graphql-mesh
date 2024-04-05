import { useDepthLimit } from '@envelop/depth-limit';
import CFWorkerKVCache from '@graphql-mesh/cache-cfw-kv';
import useMeshRateLimit from '@graphql-mesh/plugin-rate-limit';
import useMeshResponseCache from '@graphql-mesh/plugin-response-cache';
import { createServeRuntime } from '@graphql-mesh/serve-runtime';

self.addEventListener(
  'fetch',
  createServeRuntime({
    http: {
      endpoint: 'https://main--spacex-l4uc6p.apollographos.net/graphql',
    },
    cache: new CFWorkerKVCache({
      namespace: 'MESH',
    }),
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
