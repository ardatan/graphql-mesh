const { parse } = require("graphql");
const { parseSelectionSet } = require('@graphql-tools/utils');

const resolvers = {
  Query: {
    stat: async (root, args, context, info) => {
      const worldPop = await context.WorldPop.Query.population({
        root,
        args: {
          country: args.country,
        },
        context,
        info,
        selectionSet: () =>
          parseSelectionSet(/* GraphQL */ `
            {
              records {
                fields {
                  value
                }
              }
            }
          `),
      });

      const numberPop = worldPop.records[0].fields.value;

      const covidCase = await context.Covid.Query.case({
        root,
        args: {
          countryRegion: args.country,
        },
        context,
        info,
        selectionSet: () =>
          parseSelectionSet(/* GraphQL */ `
            {
              confirmed
              deaths
              recovered
              countryRegion
            }
          `),
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
    },
  },
};

module.exports = { resolvers };
