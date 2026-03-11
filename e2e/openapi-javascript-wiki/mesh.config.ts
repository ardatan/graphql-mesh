import { BigIntResolver } from 'graphql-scalars';
import type { GraphQLResolveInfo } from 'graphql/type';
import { defineConfig as defineGatewayConfig } from '@graphql-hive/gateway';
import { defineConfig as defineComposeConfig } from '@graphql-mesh/compose-cli';
import { loadOpenAPISubgraph } from '@omnigraph/openapi';
import type { MeshInContextSDK } from './types/incontext-sdk';

export const composeConfig = defineComposeConfig({
  subgraphs: [
    {
      sourceHandler: loadOpenAPISubgraph('Wiki', {
        source: 'https://api.apis.guru/v2/specs/wikimedia.org/1.0.0/swagger.yaml',
        endpoint: 'https://wikimedia.org/api/rest_v1',
        ignoreErrorResponses: true,
        operationHeaders: {
          'user-agent': 'my-app/1.0.0',
        },
      }),
    },
  ],
  additionalTypeDefs: /* GraphQL */ `
    scalar BigInt
    extend type Query {
      viewsInPastMonth(project: String!): BigInt!
    }
  `,
});

export const gatewayConfig = defineGatewayConfig({
  transportEntries: {
    '*.rest': {
      headers: [['user-agent', 'hive-gateway/e2e']],
    },
  },
  additionalResolvers: {
    BigInt: BigIntResolver,
    Query: {
      async viewsInPastMonth(
        root: never,
        { project }, // args
        context: MeshInContextSDK,
        info: GraphQLResolveInfo,
      ) {
        const result =
          await context.Wiki.Query.metrics_pageviews_aggregate_by_project_by_access_by_agent_by_granularity_by_start_by_end(
            {
              root,
              args: {
                access: 'all_access',
                agent: 'user',
                start: '20200101',
                end: '20200226',
                project,
                granularity: 'daily',
              },
              context,
              info,
              selectionSet: /* GraphQL */ `
                {
                  ... on pageview_project {
                    items {
                      views
                    }
                  }
                }
              `,
            },
          );

        let total = BigInt(0);
        for (const item of result?.items || []) {
          total += BigInt(item.views);
        }
        return total;
      },
    },
  },
});
