import { Opts } from '@e2e/opts';
import { createRenameFieldTransform, defineConfig } from '@graphql-mesh/compose-cli';
import { loadGrpcSubgraph } from '@omnigraph/grpc';

const opts = Opts(process.argv);

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadGrpcSubgraph('Pets', {
        endpoint: 'localhost:' + opts.getServicePort('Pets'),
        source: './services/Pets/pets.proto', // only needed when not running reflection
      }),
      transforms: [
        createRenameFieldTransform(({ fieldName }) => fieldName.replace('pets_PetService_', '')),
      ],
    },
    {
      sourceHandler: loadGrpcSubgraph('Stores', {
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
