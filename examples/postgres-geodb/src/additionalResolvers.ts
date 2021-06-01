import { GithubSearchType, Resolvers } from '../.mesh';
import { FieldNode, Kind, print } from 'graphql';

export const resolvers: Resolvers = {
  GeoCity: {
    developers: {
      selectionSet: /* GraphQL */ `
        {
          name
        }
      `,
      resolve: ({ name }, { limit }, context, info) => {
        const developersSelectionSet = info.fieldNodes[0].selectionSet;
        const nodesField = developersSelectionSet.selections.find(
          selection => selection.kind === Kind.FIELD && selection.name.value === 'nodes'
        ) as FieldNode;
        const nodesSelectionsStr = nodesField.selectionSet.selections.map(selection => print(selection)).join('\n');
        return context.Github.Query.Githubsearch({
          args: {
            type: 'USER' as GithubSearchType,
            query: `location:${name}`,
            first: limit,
          },
          selectionSet: /* GraphQL */ `
          {
              nodes {
                ... on GithubUser {
                    ${nodesSelectionsStr}
                }
              }
          }
                `,
          context,
          info,
        }) as any;
      },
    },
  },
};
