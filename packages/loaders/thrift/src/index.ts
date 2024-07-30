import type { MeshFetch } from '@graphql-mesh/types';
import type { GraphQLThriftLoaderOptions } from './schema.js';
import { loadNonExecutableGraphQLSchemaFromIDL } from './schema.js';

export function loadThriftSubgraph(
  name: string,
  options: Omit<GraphQLThriftLoaderOptions, 'subgraphName'>,
) {
  return ({ cwd, fetch }: { cwd: string; fetch: MeshFetch }) => ({
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
