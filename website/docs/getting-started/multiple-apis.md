---
id: multiple-apis
title: Extending Schema with Multiple APIs
sidebar_label: 5. Extending Schema with Multiple APIs
---

## Extending Schema with JavaScript Code File

You can add custom resolvers and custom GraphQL schema SDL, and use the API SDK to fetch the data and manipulate it. So the query above could be simplified with custom logic.

This is possible because GraphQL Mesh will make sure to expose all available services in each API in your `context` object.

It's named the same as the API name, so to access the API of `Wiki` source, you can use `context.Wiki.api` and use the methods you need. It's useful when you need add custom behaviours, fields and types, and also for linking types between schemas.

In the following example, we will add take the query we had in the [previous example](/docs/getting-started/basic-example), and simplify it by adding a new root operation to `Query` type, and automate the variables that it needs, in order to create a simpler version of it for the consumers.

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
    viewsInPastMonth: async (root, args, context, info) => {
      const { items } = await context.Wiki.Query.getMetricsPageviewsAggregateProjectAccessAgentGranularityStartEnd({
        root,
        args: {
          access: 'all-access',
          agent: 'user',
          end: moment().format('YYYYMMDD'),
          start: moment().startOf('month').subtract(1, 'month').format('YYYYMMDD'),
          project: args.project,
          granularity: 'monthly',
        },
        context,
        info,
        selectionSet: /* GraphQL */`
          {
            views
          }
        `
      });

      if (!items || items.length === 0) {
        return 0;
      }

      return items[0].views;
    },
  },
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

> You can find the complete example [here](https://github.com/Urigo/graphql-mesh/tree/master/examples/openapi-javascript-wiki)

> You can use TypeScript to have full type-safety in additional resolvers. See [TypeScript Support](/docs/recipes/typescript) section to learn more.

## Stitching Schemas using declarative API without JavaScript Code File

You can combine multiple APIs in Mesh using `additionalTypeDefs` and `additionalResolvers`.

The following example has two different OpenAPI sources; we add two new fields to a type of `Cities`, and those fields have return types from `Weather` API.

But this time we don't use an extra resolvers file for `additionalResolvers` but only the configuration file.

```yaml
sources:
  - name: Cities
    handler:
      openapi:
        source: https://api.apis.guru/v2/specs/mashape.com/geodb/1.0.0/swagger.json
        operationHeaders:
          'X-RapidAPI-Key': f93d3b393dmsh13fea7cb6981b2ep1dba0ajsn654ffeb48c26
  - name: Weather
    handler:
      openapi:
        source: https://api.apis.guru/v2/specs/weatherbit.io/2.0.0/swagger.json
additionalTypeDefs: |
  extend type PopulatedPlaceSummary {
    dailyForecast: [Forecast]
    todayForecast: Forecast
  }
additionalResolvers:
  - type: PopulatedPlaceSummary
    field: dailyForecast
    requiredSelectionSet:
      | # latitude and longitude will be request if dailyForecast is requested on PopulatedPlaceSummary level
      {
        latitude
        longitude
      }
    sourceName: Weather # Target Source Name
    sourceTypeName: Query # Target Root Type
    sourceFieldName: getForecastDailyLatLatLonLon # Target root field of that source
    result: data # Return `data` property of returned data
    args:
      lat: '{root.latitude}' # Access required fields and pass those to args of getForecastDailyLatLatLonLon
      lon: '{root.longitude}'
      key: "{context.headers['x-weather-api-key']}" # x-weather-api-key coming from HTTP Headers
  - type: PopulatedPlaceSummary
    field: todayForecast
    requiredSelectionSet: |
      {
        latitude
        longitude
      }
    sourceName: Weather
    sourceTypeName: Query
    sourceFieldName: getForecastDailyLatLatLonLon
    result: data[0]
    args:
      lat: '{root.latitude}'
      lon: '{root.longitude}'
      key: "{context.headers['x-weather-api-key']}"
```

The declaration above equals to the following;

```js
module.exports = {
  PopulatedPlaceSummary: {
    dailyForecast: {
      selectionSet: `
        {
          latitude
          longitude
        }
      `,
      resolve: async (root, args, context, info) => {
        const result = await context.Weather.Query.getForecastDailyLatLatLonLon({
          root,
          args: {
            lat: root.latitude,
            lon: root.longitude,
            key: context.headers['x-weather-api-key'],
          },
          context,
          info,
        });
        return result?.data;
      },
    },
    todayForecast: {
      selectionSet: `
        {
          latitude
          longitude
        }
      `,
      resolve: (root, args, context, info) => {
        const result = await context.Weather.Query.getForecastDailyLatLatLonLon({
          root,
          args: {
            lat: root.latitude,
            lon: root.longitude,
            key: context.headers['x-weather-api-key'],
          },
          context,
          info,
        });
        return result?.data?.length && result.data[0];
      },
    },
  },
};
```
