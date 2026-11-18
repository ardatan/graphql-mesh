import { process as meshProcess } from '@graphql-mesh/cross-helpers';
import type { LoadSqlSubgraphOpts } from './schema.js';
import { loadGraphQLSchemaFromSql } from './schema.js';

export * from './directives.js';
export * from './naming.js';
export * from './schema.js';
export type * from './introspect/types.js';

export function loadSqlSubgraph(name: string, opts: LoadSqlSubgraphOpts) {
  return () => ({
    name,
    schema$: loadGraphQLSchemaFromSql(name, {
      ...opts,
      cwd: opts.cwd || meshProcess.cwd(),
    }),
  });
}

export {
  getSqlExecutor,
  wrapMysqlPoolAsSqlClient,
  wrapPgPoolAsSqlClient,
} from '@graphql-mesh/transport-sql';
