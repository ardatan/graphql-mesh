import { Resolvers, Github_SearchType } from './__generated__/types';

export const resolvers: Resolvers = {
  Geo_City: {
    developers: async (cityData, { limit }, context, info) => {
      const { Github } = context;

      const result = await Github.api.Github_search(
        {
          type: Github_SearchType.User,
          query: `location:${cityData.name}`,
          first: limit
        },
        context,
        info
      );

      console.log(result);

      return [];
    }
  }
};
