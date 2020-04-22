import { Resolvers, GithubSearchType, GithubUser } from './__generated__/types';

export const resolvers: Resolvers = {
  GeoCity: {
    developers: async (cityData, { limit }, { Github }) => {
      const { nodes } = await Github.api.Githubsearch({
        type: GithubSearchType.USER,
        query: `location:${cityData.name}`,
        first: limit,
      });
      return nodes as GithubUser[];
    },
  },
};
