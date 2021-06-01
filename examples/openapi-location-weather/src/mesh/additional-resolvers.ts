import { Resolvers } from '../../.mesh';
import { print } from 'graphql';

const WEATHER_API_KEY = '971a693de7ff47a89127664547988be5';

export const resolvers: Resolvers = {
  PopulatedPlaceSummary: {
    dailyForecast: {
      selectionSet: /* GraphQL */ `
        {
          latitude
          longitude
        }
      `,
      resolve: async (placeSummary, _, context, info) => {
        const dailyForecastSelectionSet = info.fieldNodes[0].selectionSet;
        const forecast = await context.Weather.Query.getForecastDailyLatequalToLatLonLon({
          root: placeSummary,
          args: {
            lat: placeSummary.latitude!,
            lon: placeSummary.longitude!,
            key: WEATHER_API_KEY,
          },
          context,
          info,
          selectionSet: /* GraphQL */ `
            {
              data ${print(dailyForecastSelectionSet)} # Prints something like { minTemp maxTemp }
            }
          `,
        });

        return forecast.data!;
      },
    },
    todayForecast: {
      selectionSet: /* GraphQL */ `
        {
          latitude
          longitude
        }
      `,
      resolve: async (placeSummary, _, context, info) => {
        const todayForecastSelectionSet = info.fieldNodes[0].selectionSet;
        const forecast = await context.Weather.Query.getForecastDailyLatequalToLatLonLon({
          root: placeSummary,
          args: {
            lat: placeSummary.latitude!,
            lon: placeSummary.longitude!,
            key: WEATHER_API_KEY,
          },
          context,
          info,
          selectionSet: /* GraphQL */ `
            {
              data ${print(todayForecastSelectionSet)} # Prints something like { minTemp maxTemp }
            }
          `,
        });

        if (forecast?.data?.length) {
          return forecast.data[0];
        }
      },
    },
  },
};
