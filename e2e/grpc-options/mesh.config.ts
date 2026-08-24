import { Opts } from '@e2e/opts';
import { defineConfig as defineGatewayConfig } from '@graphql-hive/gateway';
import { defineConfig as defineComposeConfig } from '@graphql-mesh/compose-cli';
import { loadGrpcSubgraph } from '@omnigraph/grpc';

const opts = Opts(process.argv);

const requestTimeout = process.env.GRPC_REQUEST_TIMEOUT
  ? Number(process.env.GRPC_REQUEST_TIMEOUT)
  : 200_000;

const maxReceiveMessageLength = process.env.GRPC_MAX_RECEIVE_MESSAGE_LENGTH
  ? Number(process.env.GRPC_MAX_RECEIVE_MESSAGE_LENGTH)
  : undefined;

const reflectionToken = process.env.GRPC_REFLECTION_TOKEN;

export const composeConfig = defineComposeConfig({
  subgraphs: [
    {
      sourceHandler: loadGrpcSubgraph('Echo', {
        endpoint: 'localhost:' + opts.getServicePort('Echo'),
        // No `source` — schema is loaded via gRPC reflection
        requestTimeout,
        reflectionMetadata: reflectionToken
          ? {
              'x-reflection-token': reflectionToken,
            }
          : undefined,
        channelOptions:
          maxReceiveMessageLength != null
            ? {
                'grpc.max_receive_message_length': maxReceiveMessageLength,
              }
            : undefined,
      }),
    },
  ],
});

export const gatewayConfig = defineGatewayConfig({});
