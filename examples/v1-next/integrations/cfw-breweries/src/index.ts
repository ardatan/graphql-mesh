import { createGatewayRuntime } from '@graphql-hive/gateway-runtime';
import CFWorkerKVCache from '@graphql-mesh/cache-cfw-kv';
import useResponseCache from '@graphql-mesh/plugin-response-cache';
import * as rest from '@omnigraph/json-schema';
import supergraph from './supergraph.graphql';

const meshHttp = createGatewayRuntime({
  supergraph,
  transports: {
    rest,
  },
  cache: {
    type: 'cfw-kv',
    namespace: 'MESH',
  },
  responseCaching: {
    ttlPerCoordinate: [
      {
        coordinate: 'Query.breweries',
        ttl: 24 * 60 * 60 * 1000,
      },
    ],
  },
});

self.addEventListener('fetch', meshHttp);
