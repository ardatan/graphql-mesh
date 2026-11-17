import type { GraphQLResolveInfo, GraphQLSchema } from 'graphql';
import { createDefaultExecutor, type DisposableExecutor } from '@graphql-mesh/transport-common';
import { getDefDirectives } from '@graphql-mesh/utils';
import { getDirective, MapperKind, mapSchema } from '@graphql-tools/utils';
import { DisposableSymbols } from '@whatwg-node/disposablestack';
import { inferAdapterFromLocation } from './adapter.js';
import { batchableEqualityColumn, loadBatchedByColumn, resolveEqualityKey } from './batch.js';
import { createSqlClient } from './client.js';
import { wireSqlEntityResolvers } from './entity.js';
import { resolveMappingValue } from './mapping.js';
import { hasJoinedField, planSelection } from './plan.js';
import {
  buildDelete,
  buildInsert,
  buildSelect,
  buildUpdate,
  collectReturningColumns,
  decodeCursor,
  encodeCursor,
  mapRowToGraphql,
  mapRowToGraphqlWithJoins,
  nestedSelection,
  parseSqlDirectiveMappings,
} from './sql-builder.js';
import type {
  ParsedSqlMapping,
  SqlAdapter,
  SqlClient,
  SqlKind,
  SqlMutationKind,
  SqlQueryKind,
  SqlTransportOptions,
} from './types.js';
import { resolveConnectionStringFromEnv } from './uri.js';

export interface GetSqlExecutorOpts {
  subgraph: GraphQLSchema;
  cwd?: string;
  client?: SqlClient;
}

const MUTATION_KINDS = new Set<SqlKind>(['INSERT', 'UPDATE', 'DELETE']);

function connectionNodeSelection(selection: ParsedSqlMapping): ParsedSqlMapping {
  const nodes = nestedSelection(selection, 'nodes');
  if (nodes.entries.length) return nodes;
  const edgeNode = nestedSelection(nestedSelection(selection, 'edges'), 'node');
  if (edgeNode.entries.length) return edgeNode;
  return selection;
}

function mapSelectRow(
  row: Record<string, unknown>,
  selection: ParsedSqlMapping,
  joins: ReturnType<typeof planSelection>['joins'],
  hasMany: ReturnType<typeof planSelection>['hasMany'] = [],
) {
  return joins.length || hasMany.length
    ? mapRowToGraphqlWithJoins(row, selection, joins, hasMany)
    : mapRowToGraphql(row, selection);
}

function rowWhereFullyUnresolved(
  whereMapping: ParsedSqlMapping,
  graphqlArgs: Record<string, any>,
  parent: any,
): boolean {
  let required = 0;
  let resolved = 0;
  for (const entry of whereMapping.entries) {
    if (entry.children) continue;
    if (
      entry.key === 'filter' ||
      entry.key === 'orderBy' ||
      entry.key === 'limit' ||
      entry.key === 'offset' ||
      entry.key === 'first' ||
      entry.key === 'after' ||
      entry.key === 'last' ||
      entry.key === 'before'
    ) {
      continue;
    }
    required++;
    const val = resolveMappingValue(entry.value, { args: graphqlArgs, parent });
    if (val !== undefined) resolved++;
  }
  return required > 0 && resolved === 0;
}

async function runSqlSelect(
  sqlClient: SqlClient,
  opts: {
    schema?: GraphQLSchema;
    info?: GraphQLResolveInfo;
    table: string;
    kind: SqlQueryKind;
    selection: ParsedSqlMapping;
    whereMapping: ParsedSqlMapping;
    graphqlArgs: Record<string, any>;
    parent: any;
    context: any;
  },
) {
  const { table, kind, selection, whereMapping, graphqlArgs, parent, context } = opts;
  const fullSelection = kind === 'CONNECTION' ? connectionNodeSelection(selection) : selection;

  // Never run a ROW with unresolved equality binders (would pick an arbitrary row).
  if (kind === 'ROW' && rowWhereFullyUnresolved(whereMapping, graphqlArgs, parent)) {
    return null;
  }

  const planned =
    opts.schema && opts.info && kind !== 'COUNT'
      ? planSelection(opts.schema, opts.info, fullSelection)
      : { selection: fullSelection, joins: [], hasMany: [] };

  const selectSelection = planned.selection.entries.length ? planned.selection : fullSelection;
  const { joins, hasMany } = planned;

  // Batch ROW / simple ROWS when there is exactly one equality binder (FK / PK)
  // and we are not folding joins / has-many into this query.
  if (!joins.length && !hasMany.length && (kind === 'ROW' || kind === 'ROWS')) {
    const column = batchableEqualityColumn(whereMapping);
    if (column) {
      const key = resolveEqualityKey(whereMapping, column, graphqlArgs, parent);
      if (key !== undefined) {
        return loadBatchedByColumn(
          context,
          {
            client: sqlClient,
            table,
            kind,
            selection: selectSelection,
            whereMapping,
            column,
            graphqlArgs,
          },
          key,
        );
      }
    }
  }

  const query = buildSelect(sqlClient.adapter, {
    table,
    kind,
    selection: selectSelection,
    whereMapping,
    graphqlArgs,
    parent,
    joins,
    hasMany,
  });
  const result = await sqlClient.query(query.sql, query.params);

  if (kind === 'COUNT') {
    const row = result.rows[0] as Record<string, unknown> | undefined;
    const count = row?.count ?? row?.COUNT ?? Object.values(row || {})[0] ?? 0;
    return Number(count);
  }
  if (kind === 'ROW') {
    const row = result.rows[0] as Record<string, unknown> | undefined;
    return row ? mapSelectRow(row, selectSelection, joins, hasMany) : null;
  }
  if (kind === 'CONNECTION') {
    const first = Number(graphqlArgs.first ?? 10);
    const after = typeof graphqlArgs.after === 'string' ? graphqlArgs.after : '';
    const offset = after ? decodeCursor(after) : 0;
    const rows = result.rows as Record<string, unknown>[];
    const hasNextPage = rows.length > first;
    const pageRows = hasNextPage ? rows.slice(0, first) : rows;
    const nodes = pageRows.map(r => mapSelectRow(r, selectSelection, joins, hasMany));
    const edges = nodes.map((node, i) => ({
      cursor: encodeCursor(offset + i),
      node,
    }));
    const endCursor = edges.length ? edges[edges.length - 1].cursor : null;
    const startCursor = edges.length ? edges[0].cursor : null;

    let totalCount = offset + pageRows.length + (hasNextPage ? 1 : 0);
    if (selection.entries.some(e => e.key === 'totalCount')) {
      const countQ = buildSelect(sqlClient.adapter, {
        table,
        kind: 'COUNT',
        selection: selectSelection,
        whereMapping,
        graphqlArgs,
        parent,
      });
      const countRes = await sqlClient.query(countQ.sql, countQ.params);
      const crow = countRes.rows[0] as Record<string, unknown> | undefined;
      totalCount = Number(crow?.count ?? crow?.COUNT ?? Object.values(crow || {})[0] ?? 0);
    }

    return {
      nodes,
      edges,
      pageInfo: {
        hasNextPage,
        hasPreviousPage: offset > 0,
        startCursor,
        endCursor,
      },
      totalCount,
    };
  }
  return (result.rows as Record<string, unknown>[]).map(r =>
    mapSelectRow(r, selectSelection, joins, hasMany),
  );
}

export async function getSqlExecutor({
  subgraph,
  cwd,
  client,
}: GetSqlExecutorOpts): Promise<DisposableExecutor> {
  const transportDirectives = getDirective(subgraph, subgraph, 'transport');
  if (!transportDirectives?.length) {
    throw new Error('No @transport directive found on SQL subgraph schema');
  }
  const transport = transportDirectives[0] as {
    location?: string;
    options?: SqlTransportOptions;
  };
  const location =
    transport.location ||
    resolveConnectionStringFromEnv(undefined, { adapter: transport.options?.adapter });
  const adapter: SqlAdapter =
    transport.options?.adapter || inferAdapterFromLocation(location) || 'sqlite';
  if (!location) {
    throw new Error(
      '@transport(kind: "sql") requires location (connection URI / file path) or a Bun-compatible env URL (DATABASE_URL, POSTGRES_URL, MYSQL_URL, SQLITE_URL, …)',
    );
  }

  const sqlClient =
    client ||
    createSqlClient({
      adapter,
      location,
      cwd,
      max: transport.options?.max,
      idleTimeout: transport.options?.idleTimeout,
      connectionTimeout: transport.options?.connectionTimeout,
      tls: transport.options?.tls,
    });

  subgraph = mapSchema(subgraph, {
    [MapperKind.OBJECT_FIELD](fieldConfig) {
      const directives = getDefDirectives(subgraph, fieldConfig);
      for (const directive of directives) {
        switch (directive.name) {
          case 'sql': {
            const table = directive.args.table as string;
            const kind = (directive.args.kind || 'ROWS') as SqlKind;
            const { whereMapping, setMapping, selection } = parseSqlDirectiveMappings({
              where: directive.args.where as string | undefined,
              set: directive.args.set as string | undefined,
              selection: directive.args.selection as string | undefined,
            });

            if (MUTATION_KINDS.has(kind)) {
              const mutationKind = kind as SqlMutationKind;
              fieldConfig.resolve = async function sqlMutationResolver(_root, args) {
                if (mutationKind === 'DELETE') {
                  const query = buildDelete(sqlClient.adapter, table, whereMapping, args);
                  const result = await sqlClient.query(query.sql, query.params);
                  const affected = result.rowCount;
                  return {
                    ok: affected > 0,
                    affectedRows: affected,
                  };
                }

                const returningCols = collectReturningColumns(selection);
                const query =
                  mutationKind === 'INSERT'
                    ? buildInsert(sqlClient.adapter, table, setMapping, args, returningCols)
                    : buildUpdate(
                        sqlClient.adapter,
                        table,
                        setMapping,
                        whereMapping,
                        args,
                        returningCols,
                      );

                let row: Record<string, unknown> | undefined;
                if (returningCols.length && (adapter === 'sqlite' || adapter === 'postgres')) {
                  const result = await sqlClient.query(query.sql, query.params);
                  row = result.rows[0] as Record<string, unknown> | undefined;
                } else {
                  await sqlClient.query(query.sql, query.params);
                }

                const payloadKey = selection.entries.find(e => e.children)?.key;
                if (payloadKey) {
                  const nested = nestedSelection(selection, payloadKey);
                  return {
                    [payloadKey]: row ? mapRowToGraphql(row, nested) : null,
                  };
                }
                return row ? mapRowToGraphql(row, selection) : null;
              };
              break;
            }

            const queryKind = kind as SqlQueryKind;
            fieldConfig.resolve = async function sqlQueryResolver(
              root,
              args,
              context,
              info: GraphQLResolveInfo,
            ) {
              // Parent already folded this belongs-to via JOIN lookahead.
              if (hasJoinedField(root, info.fieldName)) {
                return root[info.fieldName];
              }
              return runSqlSelect(sqlClient, {
                schema: subgraph,
                info,
                table,
                kind: queryKind,
                selection,
                whereMapping,
                graphqlArgs: args,
                parent: root,
                context,
              });
            };
            break;
          }
        }
      }
      return fieldConfig;
    },
  });

  // Type-level `@sql` → resolveReference + Query._entities (Connectors-style).
  subgraph = wireSqlEntityResolvers(subgraph, {
    executeTypeLevelRow(sqlArgs, reference, context) {
      const table = sqlArgs.table as string;
      const { whereMapping, selection } = parseSqlDirectiveMappings({
        where: sqlArgs.where as string | undefined,
        selection: sqlArgs.selection as string | undefined,
      });
      return runSqlSelect(sqlClient, {
        table,
        kind: 'ROW',
        selection,
        whereMapping,
        graphqlArgs: {},
        parent: reference,
        context,
      });
    },
  });

  // Postgres + Node pg.Pool → Grafast / `@dataplan/pg` fast path.
  // MySQL / SQLite / Bun.SQL keep the GraphQL.js + JOIN planner path.
  // Dynamic import keeps grafast off the static graph (Jest --detectLeaks).
  if (adapter === 'postgres' && sqlClient.pgPool) {
    const { createPostgresGrafastExecutor } = await import('./pg-executor.js');
    const grafastExecutor = createPostgresGrafastExecutor({
      subgraph,
      sqlClient,
      disposeClient: () => sqlClient.dispose(),
    });
    if (grafastExecutor) {
      return grafastExecutor;
    }
  }

  const defaultExecutor = createDefaultExecutor(subgraph);
  const executor: DisposableExecutor = async function sqlExecutor(executionRequest) {
    // Ensure a shared mutable context so DataLoaders coalesce within one operation.
    const context =
      executionRequest.context && typeof executionRequest.context === 'object'
        ? executionRequest.context
        : {};
    return defaultExecutor({
      ...executionRequest,
      context,
    });
  };
  executor[DisposableSymbols.dispose] = () => sqlClient.dispose();
  executor[DisposableSymbols.asyncDispose] = async () => sqlClient.dispose();
  return executor;
}
