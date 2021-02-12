import { Resolvers } from './__generated__/types';

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
      resolve: async (placeSummary, _, { Weather }) => {
        const forecast = await Weather.api.getForecastDailyLatequalToLatLonLon({
          lat: placeSummary.latitude!,
          lon: placeSummary.longitude!,
          key: WEATHER_API_KEY,
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
      resolve: async (placeSummary, _, { Weather }) => {
        const forecast = await Weather.api.getForecastDailyLatequalToLatLonLon({
          lat: placeSummary.latitude!,
          lon: placeSummary.longitude!,
          key: WEATHER_API_KEY,
        });

        if (forecast?.data?.length) {
          return forecast.data[0];
        }
      },
    },
  },
};
