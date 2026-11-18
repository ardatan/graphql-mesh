import { process as meshProcess } from '@graphql-mesh/cross-helpers';
import type { LoadSqlSubgraphOpts } from './schema.js';
import { loadGraphQLSchemaFromSql } from './schema.js';

export * from './directives.js';
export * from './naming.js';
export * from './schema.js';
export type * from './introspect/types.js';

/**
 * Mesh compose helper: introspect a SQL database and emit an `@sql` /
 * `@transport(kind: "sql")` subgraph.
 *
 * @example
 * ```ts
 * import { createYoga } from 'graphql-yoga';
 * import { compose } from '@graphql-mesh/fusion-composition';
 * import { loadSqlSubgraph } from '@omnigraph/sql';
 *
 * const shop = loadSqlSubgraph('shop', {
 *   endpoint: process.env.DATABASE_URL ?? 'postgres://localhost/shop',
 *   schema: 'public',
 * });
 * ```
 * @example
 * ```ts
 * loadSqlSubgraph('chinook', { endpoint: 'file:./chinook.db' })
 * loadSqlSubgraph('hr', { endpoint: 'mysql://root@127.0.0.1/employees' })
 * ```
 *
 * @param name Subgraph name (also used as default `@sql(subgraph:)`).
 * @param opts Connection and emit options — see {@link LoadSqlSubgraphOpts}.
 */
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
  createSqlClient,
  getSqlExecutor,
  wrapMysqlPoolAsSqlClient,
  wrapPgPoolAsSqlClient,
} from '@graphql-mesh/transport-sql';
