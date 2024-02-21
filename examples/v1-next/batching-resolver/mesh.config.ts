import { defineConfig } from '@graphql-mesh/compose-cli';
import { loadOpenAPISubgraph } from '@omnigraph/openapi';

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadOpenAPISubgraph('ExampleAPI', {
        source: 'http://localhost:4001/openapi.json',
        endpoint: 'http://localhost:4001',
        ignoreErrorResponses: true,
      }),
    },
  ],
  additionalTypeDefs: /* GraphQL */ `
    extend type Query {
      user(id: Float!): User
        @resolver(
          subgraph: "ExampleAPI"
          kind: BATCH
          operation: """
          mutation UserBatch($id: [Float!]!) {
            usersByIds(input: { ids: $id }) {
              results
            }
          }
          """
        )
    }
  `,
});
