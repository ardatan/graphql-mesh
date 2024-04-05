import LocalforageCache from '@graphql-mesh/cache-localforage';
import {
  createRenameTypeTransform,
  defineConfig as defineComposeConfig,
} from '@graphql-mesh/compose-cli';
import useResponseCache from '@graphql-mesh/plugin-response-cache';
import { defineConfig as defineServeConfig } from '@graphql-mesh/serve-cli';
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
        createRenameTypeTransform(type => (type.name === 'Error' ? 'CitiesError' : type.name)),
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
        createRenameTypeTransform(type => (type.name === 'Error' ? 'WeatherError' : type.name)),
      ],
    },
  ],
  additionalTypeDefs: /* GraphQL */ `
    extend type PopulatedPlaceSummary {
      dailyForecast: [Forecast]
        @variable(name: "latitude", select: "latitude", subgraph: "Cities")
        @variable(name: "longitude", select: "longitude", subgraph: "Cities")
        @resolver(
          subgraph: "Weather"
          operation: """
          query getForecastDaily($latitude: Float!, $longitude: Float!) {
            forecast_daily(lat: $latitude, lon: $longitude) {
              data
            }
          }
          """
        )
      todayForecast: Forecast
        @variable(name: "latitude", select: "latitude", subgraph: "Cities")
        @variable(name: "longitude", select: "longitude", subgraph: "Cities")
        @resolver(
          subgraph: "Weather"
          operation: """
          query getForecastDaily($latitude: Float!, $longitude: Float!) {
            forecast_daily_by_lat_by_lon(lat: $latitude, lon: $longitude) {
              data
            }
          }
          """
        )
    }
  `,
});

export const serveConfig = defineServeConfig({
  cache: new LocalforageCache(),
  plugins: ctx => {
    const { cache } = ctx;
    if (!cache) {
      throw new Error('Mesh cache not available');
    }
    return [
      useResponseCache({
        ...ctx,
        cache,
        ttlPerCoordinate: [
          // Geo data doesn't change frequently, so we can cache it forever
          { coordinate: 'Query.findCitiesUsingGET', ttl: 0 },
          // Forcast data might change, so we can cache it for 1 hour only
          { coordinate: 'PopulatedPlaceSummary.dailyForecast', ttl: 3600 },
          { coordinate: 'PopulatedPlaceSummary.todayForecast', ttl: 3600 },
        ],
      }),
    ];
  },
});
