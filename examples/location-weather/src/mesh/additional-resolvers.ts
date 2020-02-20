export const resolvers = {
  PopulatedPlaceSummary: {
    dailyForecast: async (placeSummary: any, args: never, { WeatherApi }: any) => {
      const forecast = await WeatherApi.forecastDailylatlatlonlonGet(
        placeSummary.latitude,
        placeSummary.longitude,
        '971a693de7ff47a89127664547988be5'
      );

      return forecast.body.data;
    }
  }
};