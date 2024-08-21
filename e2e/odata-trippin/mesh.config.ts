import { defineConfig } from '@graphql-mesh/compose-cli';
import { loadODataSubgraph } from '@omnigraph/odata';

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadODataSubgraph('Trippin', {
        endpoint: 'https://services.odata.org/TripPinRESTierService/(S(qzsyox3345c15qeq305pblvw))/',
        batch: 'multipart',
        expandNavProps: true,
      }),
    },
  ],
});
