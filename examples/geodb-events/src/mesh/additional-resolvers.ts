import { Resolvers } from '../__generated__/mesh';

export const resolvers: Resolvers = {
  PopulatedPlaceSummary: {
    dailyForecast: async (placeSummary, args: never, { Weather }) => {
      const forecast = await Weather.api.getForecastDailyLatLatLonLon({
        lat: placeSummary.latitude,
        lon: placeSummary.longitude,
        key: Weather.config.apiKey
      });

      return forecast.data;
    },
    todayForecast: async (placeSummary, args: never, { Weather }) => {
      const forecast = await Weather.api.getForecastDailyLatLatLonLon({
        lat: placeSummary.latitude,
        lon: placeSummary.longitude,
        key: Weather.config.apiKey
      });

      return forecast.data[0];
    }
  }
};
