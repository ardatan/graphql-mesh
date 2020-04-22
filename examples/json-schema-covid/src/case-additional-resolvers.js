const resolvers = {
  Case: {
    population: async ({ countryRegion }, args, { WorldPop }) => {
      if (countryRegion) {
        return await WorldPop.api.population({
          country: countryRegion,
        });
      }
      throw Error(
        "countryRegion is a needed field at case level to get population info"
      );
    },
  },
};

module.exports = { resolvers };
