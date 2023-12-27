import { GraphQLSchema } from 'graphql';
import { getMySQLExecutor } from './execution.js';
import { loadGraphQLSchemaFromMySQL, LoadGraphQLSchemaFromMySQLOpts } from './schema.js';

export * from './schema.js';
export * from './execution.js';

export function loadMySQLSubgraph(name: string, opts: LoadGraphQLSchemaFromMySQLOpts) {
  return () => ({
    name,
    schema$: loadGraphQLSchemaFromMySQL(name, opts),
  });
}

export interface MySQLTransportEntry {
  kind: 'mysql';
  location: string;
}

export function getSubgraphExecutor(
  _transportEntry: MySQLTransportEntry,
  getSubgraph: () => GraphQLSchema,
) {
  return getMySQLExecutor({
    subgraph: getSubgraph(),
  });
}
