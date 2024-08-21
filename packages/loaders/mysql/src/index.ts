import type { LoadGraphQLSchemaFromMySQLOpts } from './schema.js';
import { loadGraphQLSchemaFromMySQL } from './schema.js';

export * from './schema.js';

export function loadMySQLSubgraph(name: string, opts: LoadGraphQLSchemaFromMySQLOpts) {
  return () => ({
    name,
    schema$: loadGraphQLSchemaFromMySQL(name, opts),
  });
}

export { getMySQLExecutor } from '@graphql-mesh/transport-mysql';
