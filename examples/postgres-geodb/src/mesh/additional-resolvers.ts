import { Resolvers, GithubSearchType } from './__generated__/types';

export const resolvers: Resolvers = {
  GeoCity: {
    developers: async (cityData, { limit }, { Github }, info) => Github.api.Githubsearch(
      {
        type: GithubSearchType.User,
        query: `location:${cityData.name}`,
        first: limit
      })
  }
};
