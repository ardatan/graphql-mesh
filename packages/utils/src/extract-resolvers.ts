import { getResolversFromSchema } from '@graphql-tools/utils';
import { GraphQLSchema } from 'graphql';

export function extractResolvers(schema: GraphQLSchema) {
  const allResolvers = getResolversFromSchema(schema);
  const filteredResolvers: any = {};
  for (const prop in allResolvers) {
    if (!prop.startsWith('_')) {
      filteredResolvers[prop] = allResolvers[prop];
    }
  }
  return filteredResolvers;
}
