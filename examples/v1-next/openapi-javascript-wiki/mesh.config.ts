import type { MeshComposeCLIConfig } from '@graphql-mesh/compose-cli';
import type { MeshServeCLIConfig } from '@graphql-mesh/serve-cli';
import { loadOpenAPISubgraph } from '@omnigraph/openapi';
import { resolvers as additionalResolvers } from './additional-resolvers';

export const composeConfig: MeshComposeCLIConfig = {
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
};

export const serveConfig: MeshServeCLIConfig = {
  additionalResolvers,
};
