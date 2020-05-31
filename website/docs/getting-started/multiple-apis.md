---
id: multiple-apis
title: Multiple APIs
sidebar_label: 5. Multiple APIs
---

## Extending Schema

You can add custom resolvers and custom GraphQL schema SDL, and use the API SDK to fetch the data and manipulate it. So the query above could be simplified with custom logic.

This is possible because GraphQL Mesh will make sure to expose all available services in each API in your `context` object.

It's named the same as the API name, so to access the API of `Wiki` source, you can use `context.Wiki.api` and use the methods you need. It's useful when you need add custom behaviours, fields and types, and also for linking types between schemas.

In the following example, we will add take the query we has in the [previous example](/docs/getting-started/basic-example), and simplify it by adding a new root operation to `Query` type, and automate the variables that it needs, in order to create a simpler version of it for the consumers.

To add a new simple field, that just returns the amount of views for the past month, you can wrap it as following in your GraphQL config file, and add custom resolvers file using `additionalResolvers` field:

```yml
sources:
  - name: Wiki
    handler:
      openapi:
        source: https://api.apis.guru/v2/specs/wikimedia.org/1.0.0/swagger.yaml
additionalTypeDefs: |
          extend type Query {
            viewsInPastMonth(project: String!): Float!
          }
additionalResolvers:
  - ./src/mesh/additional-resolvers.js
```

Now, we need to implement `src/mesh/additional-resolvers.js` with code that fetches and manipulate the data:

```js
const moment = require('moment');

const resolvers = {
  Query: {
    viewsInPastMonth: async (root, args, { Wiki }) => {
      const {
        items
      } = await Wiki.api.getMetricsPageviewsAggregateProjectAccessAgentGranularityStartEnd(
        {
          access: 'all-access',
          agent: 'user',
          end: moment().format('YYYYMMDD'),
          start: moment()
            .startOf('month')
            .subtract(1, 'month')
            .format('YYYYMMDD'),
          project: args.project,
          granularity: 'monthly'
        }
      );

      if (!items || items.length === 0) {
        return 0;
      }

      return items[0].views;
    }
  }
};

module.exports = { resolvers };
```

Now run `graphql-mesh serve` and you'll be able to see your new field as part of your GraphQL schema, and you'll be able to query for it.

And now we run the the following GraphQL query to fetch the simplified data:

```graphql
query viewsInPastMonth {
  viewsInPastMonth(project: "en.wikipedia.org")
}
```

> You can find the complete example [here](https://github.com/Urigo/graphql-mesh/tree/master/examples/javascript-wiki)

## Stitching Schemas

You can combine multiple APIs in Mesh using `additionalTypeDefs` and `additionalResolvers`. 

The following example has two different OpenAPI sources; we add two new fields to a type of `Cities`, and those fields have return types from `Weather` API.

```yaml
sources:
  - name: Cities
    handler:
      openapi:
        source: https://api.apis.guru/v2/specs/mashape.com/geodb/1.0.0/swagger.json
        operationHeaders:
          'X-RapidAPI-Key': f93d3b393dmsh13fea7cb6981b2ep1dba0ajsn654ffeb48c26
  - name: Weather
    context:
      apiKey: 971a693de7ff47a89127664547988be5
    handler:
      openapi:
        source: https://api.apis.guru/v2/specs/weatherbit.io/2.0.0/swagger.json
additionalTypeDefs: |
      extend type PopulatedPlaceSummary {
        dailyForecast: [Forecast]
        todayForecast: Forecast
      }
additionalResolvers:
  - ./additional-resolvers.js
```

After declaration, we stitch APIs in resolvers level;

```js
module.exports = {
  // In here we call `Weather` API in `Cities` API.
  PopulatedPlaceSummary: {
    dailyForecast: async (placeSummary, _, { Weather }) => {
      const forecast = await Weather.api.getForecastDailyLatLatLonLon({
        lat: placeSummary.latitude!,
        lon: placeSummary.longitude!,
        key: Weather.config.apiKey,
      });

      return forecast.data!;
    },
    todayForecast: async (placeSummary, _, { Weather }) => {
      const forecast = await Weather.api.getForecastDailyLatLatLonLon({
        lat: placeSummary.latitude!,
        lon: placeSummary.longitude!,
        key: Weather.config.apiKey,
      });

      return forecast.data![0]!;
    },
  },
};
```

You can use TypeScript to have full type-safety in additional resolvers. See [TypeScript Support](/docs/recipes/typescript) section to learn more.

