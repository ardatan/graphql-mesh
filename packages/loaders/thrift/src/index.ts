import { GraphQLSchema } from 'graphql';
import { getThriftExecutor } from './execution.js';
import { GraphQLThriftLoaderOptions, loadNonExecutableGraphQLSchemaFromIDL } from './schema.js';

export default async function loadGraphQLSchemaFromThriftIDL(
  name: string,
  opts: Omit<GraphQLThriftLoaderOptions, 'subgraphName'>,
) {
  return loadNonExecutableGraphQLSchemaFromIDL({
    ...opts,
    subgraphName: name,
  });
}

export * from './types.js';
export * from './schema.js';
export * from './execution.js';
export * from './client.js';

export function loadThriftSubgraph(
  name: string,
  options: Omit<GraphQLThriftLoaderOptions, 'subgraphName'>,
) {
  return ({ cwd, fetch }: { cwd: string; fetch: typeof globalThis.fetch }) => ({
    name,
    schema$: loadNonExecutableGraphQLSchemaFromIDL({
      fetchFn: fetch,
      baseDir: cwd,
      subgraphName: name,
      ...options,
    }),
  });
}

export function getSubgraphExecutor(transportContext: { getSubgraph: () => GraphQLSchema }) {
  return getThriftExecutor(transportContext.getSubgraph());
}
