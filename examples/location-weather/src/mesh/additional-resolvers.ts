export const resolvers = {
  PopulatedPlaceSummary: {
    dailyForecast: async (placeSummary: any, args: never, { Weather }: any) => {
      const forecast = await Weather.api.getForecastDailyLatLatLonLon({
        lat: placeSummary.latitude,
        lon: placeSummary.longitude,
        key: Weather.config.apiKey
      });

      return forecast.data;
    }
  }
};