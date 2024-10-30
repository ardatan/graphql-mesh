import { Opts } from '@e2e/opts';
import { defineConfig as defineGatewayConfig } from '@graphql-hive/gateway';
import {
  createNamingConventionTransform,
  defineConfig as defineComposeConfig,
} from '@graphql-mesh/compose-cli';
import { loadGrpcSubgraph } from '@omnigraph/grpc';

const opts = Opts(process.argv);

export const composeConfig = defineComposeConfig({
  subgraphs: [
    {
      sourceHandler: loadGrpcSubgraph('movies', {
        endpoint: 'localhost:' + opts.getServicePort('movies'),
        metaData: {
          someKey: 'someValue',
          connection_type: '{context.headers.connection}',
        },
        source: './services/movies/proto/service.proto',
      }),
      transforms: [
        createNamingConventionTransform({
          fieldNames: 'camelCase',
        }),
      ],
    },
  ],
});

export const gatewayConfig = defineGatewayConfig({
  deferStream: true,
});
