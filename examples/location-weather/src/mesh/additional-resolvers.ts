export const resolvers = {
  PopulatedPlaceSummary: {
    dailyForecast: async (placeSummary: any, args: never, { Weather }: any) => {
      const forecast = await Weather.api.getForecastDailyLatLatLonLon({
        lat: placeSummary.latitude,
        lon: placeSummary.longitude,
        key: '971a693de7ff47a89127664547988be5'
      });

      return forecast.data;
    }
  }
};