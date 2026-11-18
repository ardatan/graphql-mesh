import { Opts } from '@e2e/opts';
import { defineConfig as defineGatewayConfig } from '@graphql-hive/gateway';
import { createRenameFieldTransform, defineConfig } from '@graphql-mesh/compose-cli';
import { loadProtobufSubgraph } from '@omnigraph/protobuf';

const opts = Opts(process.argv);

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadProtobufSubgraph('Pets', {
        type: 'grpc',
        endpoint: 'localhost:' + opts.getServicePort('Pets'),
        source: './services/Pets/pets.proto', // only needed when not running reflection
      }),
      transforms: [
        createRenameFieldTransform(({ fieldName }) => fieldName.replace('pets_PetService_', '')),
      ],
    },
    {
      sourceHandler: loadProtobufSubgraph('Stores', {
        type: 'grpc',
        endpoint: 'localhost:' + opts.getServicePort('Stores'),
        source: './services/Stores/pet-store.proto', // only needed when not running reflection
      }),
      transforms: [
        createRenameFieldTransform(({ fieldName }) =>
          fieldName.replace('petstore_PetStoreService_', ''),
        ),
      ],
    },
  ],
});

export const gatewayConfig = defineGatewayConfig({
  transports: {
    protobuf: import('@graphql-mesh/transport-protobuf'),
  },
});
