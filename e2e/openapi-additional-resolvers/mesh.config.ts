import { defineConfig as defineGatewayConfig } from '@graphql-hive/gateway';
import { defineConfig as defineComposeConfig } from '@graphql-mesh/compose-cli';
import { loadOpenAPISubgraph } from '@omnigraph/openapi';

export const composeConfig = defineComposeConfig({
  subgraphs: [
    {
      sourceHandler: loadOpenAPISubgraph('Wiki', {
        source: 'https://api.apis.guru/v2/specs/wikimedia.org/1.0.0/swagger.yaml',
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

export const gatewayConfig = defineGatewayConfig({
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
