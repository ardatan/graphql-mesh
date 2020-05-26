---
id: multiple-apis
title: Multiple APIs
sidebar_label: 5. Multiple APIs
---

You can combine multiple APIs in Mesh using `extend` transform and `additionalResolvers`. 

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
transforms:
  - extend: |
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

