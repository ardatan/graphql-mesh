import moment from 'moment';
import { defineConfig as defineGatewayConfig } from '@graphql-hive/gateway';
import { defineConfig as defineComposeConfig } from '@graphql-mesh/compose-cli';
import { loadOpenAPISubgraph } from '@omnigraph/openapi';

export const composeConfig = defineComposeConfig({
  subgraphs: [
    {
      sourceHandler: loadOpenAPISubgraph('Wiki', {
        source: 'https://api.apis.guru/v2/specs/wikimedia.org/1.0.0/swagger.yaml',
        endpoint: 'https://wikimedia.org/api/rest_v1',
        ignoreErrorResponses: true,
      }),
    },
  ],
  additionalTypeDefs: /* GraphQL */ `
    extend type Query {
      viewsInPastMonth(project: String!): Int!
    }
  `,
});

export const gatewayConfig = defineGatewayConfig({
  additionalResolvers: {
    Query: {
      async viewsInPastMonth(root, { project }, context: any, info) {
        const result =
          await context.Wiki.Query.metrics_pageviews_aggregate_by_project_by_access_by_agent_by_granularity_by_start_by_end(
            {
              root,
              args: {
                access: 'all_access',
                agent: 'user',
                end: moment().format('YYYYMMDD'),
                start: moment().startOf('month').subtract(1, 'month').format('YYYYMMDD'),
                project,
                granularity: 'daily',
              },
              context,
              info,
              autoSelectionSetWithDepth: 2,
            },
          );

        if (result == null || !('items' in result)) {
          return null;
        }

        if (result != null && 'items' in result) {
          return result?.items?.[0]?.views || 0;
        }
      },
    },
  },
});
