import moment from 'moment';
import type { Resolvers } from './.mesh';

export const resolvers: Resolvers = {
  Query: {
    async viewsInPastMonth(root, { project }, context, info) {
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
};
