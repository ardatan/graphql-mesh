const resolvers = {
  Query: {
    stat: async (root, args, { WorldPop, Covid }) => {
      const worldPop = await WorldPop.api.population({
        country: args.country,
      });
      const covid = await Covid.api.case({
        countryRegion: args.country,
      });
      const numberPop = worldPop.records[0].fields.value;

      const numberConfirmed = covid.confirmed;
      const numberDeath = covid.deaths;
      const numberRecovered = covid.recovered;
      return {
        confirmedRatio: ((numberConfirmed * 1.0) / numberPop) * 1.0,
        deathRatio: ((numberDeath * 1.0) / numberPop) * 1.0,
        recoveredRatio: ((numberRecovered * 1.0) / numberPop) * 1.0,
        case: covid,
        population: worldPop
      };
    },
  },
};

module.exports = { resolvers };
