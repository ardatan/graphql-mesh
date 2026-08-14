import { Opts } from '@e2e/opts';
import {
  createEncapsulateTransform,
  defineConfig,
  loadGraphQLHTTPSubgraph,
} from '@graphql-mesh/compose-cli';

const opts = Opts(process.argv);

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadGraphQLHTTPSubgraph('Subgraph1', {
        endpoint: `http://localhost:${opts.getServicePort('Subgraph1')}/graphql`,
      }),
      transforms: [
        createEncapsulateTransform({
          name: 'Subgraph1',
          applyTo: { query: true, mutation: true, subscription: true },
        }),
      ],
    },
    {
      sourceHandler: loadGraphQLHTTPSubgraph('Subgraph2', {
        endpoint: `http://localhost:${opts.getServicePort('Subgraph2')}/graphql`,
      }),
      transforms: [
        createEncapsulateTransform({
          name: 'Subgraph2',
          applyTo: { query: true, mutation: true, subscription: true },
        }),
      ],
    },
  ],
  additionalTypeDefs: /* GraphQL */ `
    extend type TargetType {
      complexDataItem: SubComplexDataFieldType
        @resolveTo(
          requiredSelectionSet: "{ id }"
          sourceName: "Subgraph1"
          sourceTypeName: "Query"
          sourceFieldName: "_encapsulated_Subgraph1_complexData"
          sourceArgs: { id: "{root.id}" }
          result: "items[0]"
        )
    }
  `,
});
