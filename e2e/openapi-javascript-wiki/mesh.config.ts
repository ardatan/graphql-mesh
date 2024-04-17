import moment from 'moment';
import { Args } from '@e2e/args';
import { defineConfig as defineComposeConfig } from '@graphql-mesh/compose-cli';
import { defineConfig as defineServeConfig } from '@graphql-mesh/serve-cli';
import { loadOpenAPISubgraph } from '@omnigraph/openapi';

const args = Args(process.argv);

export const composeConfig = defineComposeConfig({
  target: args.get('target'),
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
  fusiongraph: '', // TODO: dont require fusiongraph option since it can be provided from as a CLI arg
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
          return result?.items?.[0]?.views || 0n;
        }
      },
    },
  },
});
