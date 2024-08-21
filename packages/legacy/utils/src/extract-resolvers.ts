import type { GraphQLSchema } from 'graphql';
import { getResolversFromSchema } from '@graphql-tools/utils';

export function extractResolvers(schema: GraphQLSchema) {
  const allResolvers = getResolversFromSchema(schema);
  const filteredResolvers: any = {};
  for (const prop in allResolvers) {
    if (!prop.startsWith('_')) {
      filteredResolvers[prop] = allResolvers[prop];
    }
    if (typeof filteredResolvers === 'object') {
      for (const fieldName in filteredResolvers[prop]) {
        if (!prop.startsWith('_resolveType')) {
          filteredResolvers[prop][fieldName] =
            allResolvers[prop][fieldName as keyof (typeof allResolvers)[typeof prop]];
        }
      }
    }
  }
  return filteredResolvers;
}
