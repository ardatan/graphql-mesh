import { getExecutableThriftSchema } from './execution.js';
import { GraphQLThriftLoaderOptions, loadNonExecutableGraphQLSchemaFromIDL } from './schema.js';

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

export * from './types.js';
export * from './schema.js';
export * from './execution.js';
export * from './client.js';
