import moment from 'moment';
import { Access5, Agent3, Granularity22, Resolvers } from './.mesh';

export const resolvers: Resolvers = {
  Query: {
    async viewsInPastMonth(root, { project }, context, info) {
      const result = await context.Wiki.Query.getMetricsPageviewsAggregateProjectAccessAgentGranularityStartEnd({
        root,
        args: {
          access: Access5.ALL_ACCESS,
          agent: Agent3.USER,
          end: moment().format('YYYYMMDD'),
          start: moment().startOf('month').subtract(1, 'month').format('YYYYMMDD'),
          project,
          granularity: Granularity22.DAILY,
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

      if (!result?.items || result?.items.length === 0) {
        return 0;
      }

      return result?.items[0].views;
    },
  },
};
