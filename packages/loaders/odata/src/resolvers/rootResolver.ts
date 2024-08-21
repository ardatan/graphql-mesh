import type { GraphQLFieldResolver } from 'graphql';

export const rootResolver: GraphQLFieldResolver<any, any> = function rootResolver(root) {
  return root;
};
