import { GraphQLThriftLoaderOptions, loadNonExecutableGraphQLSchemaFromIDL } from './schema.js';

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

export { loadNonExecutableGraphQLSchemaFromIDL };

export { getThriftExecutor } from '@graphql-mesh/transport-thrift';
