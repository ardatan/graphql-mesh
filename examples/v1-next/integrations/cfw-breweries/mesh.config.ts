import { OperationTypeNode } from 'graphql';
import { defineConfig } from '@graphql-mesh/compose-cli';
import { loadJSONSchemaSubgraph } from '@omnigraph/json-schema';

export const composeConfig = defineConfig({
  output: './src/supergraph.graphql.ts',
  subgraphs: [
    {
      sourceHandler: loadJSONSchemaSubgraph('OpenBreweryDB', {
        endpoint: 'https://api.openbrewerydb.org/v1/',
        operations: [
          {
            type: OperationTypeNode.QUERY,
            field: 'breweries',
            path: '/breweries',
            method: 'GET',
            requestSample: './json-samples/breweriesInput.json',
            responseSample: './json-samples/breweries.json',
          },
        ],
      }),
    },
  ],
});
