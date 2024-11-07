import { defineConfig as defineGatewayConfig } from '@graphql-hive/gateway';
import {
  createRenameTypeTransform,
  defineConfig as defineComposeConfig,
} from '@graphql-mesh/compose-cli';
import { loadOpenAPISubgraph } from '@omnigraph/openapi';

export const composeConfig = defineComposeConfig({
  subgraphs: [
    {
      sourceHandler: loadOpenAPISubgraph('Cities', {
        source: 'https://api.apis.guru/v2/specs/mashape.com/geodb/1.0.0/swagger.json',
        ignoreErrorResponses: true,
        operationHeaders: {
          'X-RapidAPI-Key': '{env.GEODB_API_KEY}',
        },
      }),
      transforms: [
        createRenameTypeTransform(({ typeName }) =>
          typeName === 'Error' ? 'CitiesError' : typeName,
        ),
      ],
    },
    {
      sourceHandler: loadOpenAPISubgraph('Weather', {
        source: 'https://api.apis.guru/v2/specs/weatherbit.io/2.0.0/swagger.json',
        ignoreErrorResponses: true,
        queryParams: {
          key: '{env.WEATHERBIT_API_KEY}',
        },
        operationHeaders: {
          'X-RapidAPI-Key': '{env.WEATHERBIT_API_KEY}',
        },
      }),
      transforms: [
        createRenameTypeTransform(({ typeName }) =>
          typeName === 'Error' ? 'WeatherError' : typeName,
        ),
      ],
    },
  ],
  additionalTypeDefs: /* GraphQL */ `
    extend type PopulatedPlaceSummary {
      dailyForecast: [Forecast]
        @resolveTo(
          requiredSelectionSet: """
          {
             latitude
             longitude
           }
          """
          sourceName: "Weather"
          sourceTypeName: "Query"
          sourceFieldName: "forecast_daily"
          sourceArgs: { lat: "{root.latitude}", lon: "{root.longitude}" }
          result: "data"
        )
      todayForecast: Forecast
        @resolveTo(
          requiredSelectionSet: """
          {
             latitude
             longitude
           }
          """
          sourceName: "Weather"
          sourceTypeName: "Query"
          sourceFieldName: "forecast_daily"
          sourceArgs: { lat: "{root.latitude}", lon: "{root.longitude}", days: 1 }
          result: "data[0]"
        )
    }
  `,
});

export const gatewayConfig = defineGatewayConfig({
  responseCaching: {
    ttlPerCoordinate: [
      // Geo data doesn't change frequently, so we can cache it forever
      { coordinate: 'Query.findCitiesUsingGET', ttl: 0 },
      // Forcast data might change, so we can cache it for 1 hour only
      { coordinate: 'PopulatedPlaceSummary.dailyForecast', ttl: 3600 },
      { coordinate: 'PopulatedPlaceSummary.todayForecast', ttl: 3600 },
    ],
  },
});
