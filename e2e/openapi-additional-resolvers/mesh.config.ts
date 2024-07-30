import { defineConfig as defineComposeConfig } from '@graphql-mesh/compose-cli';
import { defineConfig as defineServeConfig } from '@graphql-mesh/serve-cli';
import { loadOpenAPISubgraph } from '@omnigraph/openapi';

export const composeConfig = defineComposeConfig({
  subgraphs: [
    {
      sourceHandler: loadOpenAPISubgraph('Wiki', {
        source: 'https://wikimedia.org/api/rest_v1/?spec',
        endpoint: 'https://wikimedia.org/api/rest_v1',
      }),
    },
  ],
  additionalTypeDefs: /* GraphQL */ `
    extend type pageview_project {
      banana: String
      apple: String!
    }
  `,
});

export const serveConfig = defineServeConfig({
  additionalResolvers: {
    pageview_project: {
      banana() {
        return '🍌';
      },
      apple() {
        return '🍎';
      },
    },
  },
});
