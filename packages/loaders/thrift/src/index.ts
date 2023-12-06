import { getExecutableThriftSchema } from './execution';
import { GraphQLThriftLoaderOptions, loadNonExecutableGraphQLSchemaFromIDL } from './schema';

export default async function loadGraphQLSchemaFromThriftIDL(
  name: string,
  opts: Omit<GraphQLThriftLoaderOptions, 'subgraphName'>,
) {
  const nonExecutableSchema = await loadNonExecutableGraphQLSchemaFromIDL({
    ...opts,
    subgraphName: name,
  });
  return getExecutableThriftSchema(nonExecutableSchema);
}

export * from './types';
export * from './schema';
export * from './execution';
export * from './client';
