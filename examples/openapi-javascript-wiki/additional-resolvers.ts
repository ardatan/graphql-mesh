import moment from 'moment';
import type { Access5, Agent3, Granularity22, Resolvers } from './.mesh';

export const resolvers: Resolvers = {
  Query: {
    async viewsInPastMonth(root, { project }, context, info) {
      const result = await context.Wiki.Query.getMetricsPageviewsAggregateProjectAccessAgentGranularityStartEnd({
        root,
        args: {
          access: 'all-access',
          agent: 'user',
          end: moment().format('YYYYMMDD'),
          start: moment().startOf('month').subtract(1, 'month').format('YYYYMMDD'),
          project,
          granularity: 'daily',
        },
        context,
        info,
        selectionSet: /* GraphQL */ `
          {
            items {
              views
            }
          }
        `,
      });

      return result?.items?.[0]?.views || 0;
    },
  },
};
