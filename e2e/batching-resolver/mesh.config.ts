import { Args } from '@e2e/args';
import { defineConfig } from '@graphql-mesh/compose-cli';
import { loadOpenAPISubgraph } from '@omnigraph/openapi';

const args = Args(process.argv);

export const composeConfig = defineConfig({
  output: args.get('output'),
  subgraphs: [
    {
      sourceHandler: loadOpenAPISubgraph('API', {
        source: `http://0.0.0.0:${args.getServicePort('api')}/openapi.json`,
        endpoint: `http://0.0.0.0:${args.getServicePort('api')}`,
        ignoreErrorResponses: true,
      }),
    },
  ],
  additionalTypeDefs: /* GraphQL */ `
    extend type Query {
      user(id: Float!): User
        @resolver(
          subgraph: "API"
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
