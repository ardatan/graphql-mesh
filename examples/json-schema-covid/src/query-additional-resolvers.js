module.exports = {
  Query: {
    stat: async (root, args, context, info) => {
      const worldPop = await context.WorldPop.Query.population({
        root,
        args: {
          country: args.country,
        },
        context,
        info,
        selectionSet: /* GraphQL */ `
          {
            records {
              fields {
                value
              }
            }
          }
        `,
      });

      const numberPop = worldPop.records[0].fields.value;

      const covidCase = await context.Covid.Query.case({
        root,
        args: {
          countryRegion: args.country,
        },
        context,
        info,
        selectionSet: /* GraphQL */ `
          {
            confirmed
            deaths
            countryRegion
          }
        `,
      });
      const numberConfirmed = covidCase.confirmed;
      const numberDeath = covidCase.deaths;
      return {
        confirmedRatio: ((numberConfirmed * 1.0) / numberPop) * 1.0,
        deathRatio: ((numberDeath * 1.0) / numberPop) * 1.0,
        population: worldPop,
        case: covidCase,
      };
    },
  },
};
