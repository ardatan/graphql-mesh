import { defineConfig as defineComposeConfig } from '@graphql-mesh/compose-cli';
import { defineConfig as defineServeConfig } from '@graphql-mesh/serve-cli';
import { loadOpenAPISubgraph } from '@omnigraph/openapi';
import { resolvers as additionalResolvers } from './additional-resolvers';

export const composeConfig = defineComposeConfig({
  subgraphs: [
    {
      sourceHandler: loadOpenAPISubgraph('Wiki', {
        source: 'https://wikimedia.org/api/rest_v1/?spec',
        endpoint: 'https://wikimedia.org/api/rest_v1',
        ignoreErrorResponses: true,
      }),
    },
  ],
  additionalTypeDefs: /* GraphQL */ `
    extend type Query {
      viewsInPastMonth(project: String!): BigInt!
    }
  `,
});

export const serveConfig = defineServeConfig({
  supergraph: './supergraph.graphql',
  additionalResolvers,
});
