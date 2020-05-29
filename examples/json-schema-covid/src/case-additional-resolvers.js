const resolvers = {
  Case: {
    population: {
      selectionSet: /* GraphQL */` { countryRegion } `,
      resolve: ({ countryRegion }, args, { WorldPop }) => {
        return WorldPop.api.population({
          country: countryRegion,
        });
      }
    },
  },
};

module.exports = { resolvers };
