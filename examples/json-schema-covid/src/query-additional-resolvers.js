const resolvers = {
  Query: {
    stat: async (root, args, { WorldPop, Covid }) => {
      const worldPop = await WorldPop.api.population({
        country: args.country,
      }, {
        fields: {
          records: {
            fields: {
              value: true,
            }
          }
        }
      });

      const numberPop = worldPop.records[0].fields.value;

      const covidCase = await Covid.api.case({
        countryRegion: args.country,
      }, {
        fields: {
          confirmed: true,
          deaths: true,
          recovered: true,
          countryRegion: true,
        }
      });
      const numberConfirmed = covidCase.confirmed;
      const numberDeath = covidCase.deaths;
      const numberRecovered = covidCase.recovered;
      return {
        confirmedRatio: ((numberConfirmed * 1.0) / numberPop) * 1.0,
        deathRatio: ((numberDeath * 1.0) / numberPop) * 1.0,
        recoveredRatio: ((numberRecovered * 1.0) / numberPop) * 1.0,
        population: worldPop,
        case: covidCase,
      };
    }
  }
};

module.exports = { resolvers };
