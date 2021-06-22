const moment = require('moment');
const { parseSelectionSet } = require('@graphql-tools/utils');

const resolvers = {
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
          granularity: 'monthly',
        },
        context,
        info,
        selectionSet: () => parseSelectionSet(/* GraphQL */`
          {
            items {
              views 
            }
          }
        `)
      });

      if (!result?.items || result?.items.length === 0) {
        return 0;
      }

      return result?.items[0].views;
    }
  }
};

module.exports = { resolvers };
