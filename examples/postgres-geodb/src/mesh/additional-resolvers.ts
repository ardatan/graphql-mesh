import { Resolvers, GithubSearchType } from './__generated__/types';

export const resolvers: Resolvers = {
  GeoCity: {
    developers: async (cityData, { limit }, context, info) => context.Github.api.Githubsearch(
      {
        type: GithubSearchType.User,
        query: `location:${cityData.name}`,
        first: limit
      },
      context,
      info
    )
  }
};
