const resolvers = {
  Case: {
    population: ({ countryRegion }, args, { WorldPop }) => {
      return WorldPop.api.population({
        country: countryRegion,
      });
    },
  },
};

module.exports = { resolvers };
