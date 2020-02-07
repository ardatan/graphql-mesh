import { Resolvers } from './schema/resolvers.types';

export const resolvers: Resolvers = {
  PopulatedPlaceSummary: {
    dailyForecast: async (placeSummary, args: never, { WeatherApi }) => {
      const forecast = await WeatherApi.forecastDailylatlatlonlonGet(
        placeSummary.latitude,
        placeSummary.longitude,
        '971a693de7ff47a89127664547988be5'
      );

      return forecast.body.data;
    }
  }
};
