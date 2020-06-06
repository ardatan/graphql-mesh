import { Resolvers } from './__generated__/types';

const WEATHER_API_KEY = '971a693de7ff47a89127664547988be5';

export const resolvers: Resolvers = {
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
