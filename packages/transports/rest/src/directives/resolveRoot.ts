import type { GraphQLField } from 'graphql';

function rootResolver(root: any) {
  return root;
}

export function processResolveRootAnnotations(field: GraphQLField<any, any>) {
  field.resolve = rootResolver;
}
