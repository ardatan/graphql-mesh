import { GraphQLSchema } from 'graphql';
import { getMySQLExecutor } from './execution';
import { loadGraphQLSchemaFromMySQL, LoadGraphQLSchemaFromMySQLOpts } from './schema';

export * from './schema';
export * from './execution';

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
