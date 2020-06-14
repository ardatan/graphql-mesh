const moment = require('moment');

const resolvers = {
  Query: {
    async viewsInPastMonth(_, { project }, { Wiki }) {
      const { items } = await Wiki.api.getMetricsPageviewsAggregateProjectAccessAgentGranularityStartEnd(
        {
          access: 'all-access',
          agent: 'user',
          end: moment().format('YYYYMMDD'),
          start: moment().startOf('month').subtract(1, 'month').format('YYYYMMDD'),
          project,
          granularity: 'monthly'
        });

      if (!items || items.length === 0) {
        return 0;
      }

      return items[0].views;
    },
    async viewsOver500K(_, { project }, { Wiki }) {
      const pageviewTops = await Wiki.api.getMetricsPageviewsTopProjectAccessYearMonthDay(
        {
          project: "en.wikipedia.org",
          access: "all-access",
          day: "31",
          month: "05",
          year: "2020"
        }, {
          fields: {
            items: {
              articles: {
                views: true
              }
            }
          }
        });
      pageviewTops.items.forEach((item, index, array) => {
        console.log(item);
        array[index].articles = item.articles.filter(
          element => {
            return element.views >= 500000;
          }
        );
      });
      return pageviewTops;
    }
  }
};

module.exports = { resolvers };
