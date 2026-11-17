import type { GraphQLSchema } from 'graphql';
import { createDefaultExecutor, type DisposableExecutor } from '@graphql-mesh/transport-common';
import { getDefDirectives } from '@graphql-mesh/utils';
import { getDirective, MapperKind, mapSchema } from '@graphql-tools/utils';
import { DisposableSymbols } from '@whatwg-node/disposablestack';
import {
  batchableEqualityColumn,
  loadBatchedByColumn,
  resolveEqualityKey,
} from './batch.js';
import { createSqlClient } from './client.js';
import { inferDialectFromLocation } from './dialect.js';
import { wireSqlEntityResolvers } from './entity.js';
import {
  buildDelete,
  buildInsert,
  buildSelect,
  buildUpdate,
  collectReturningColumns,
  decodeCursor,
  encodeCursor,
  mapRowToGraphql,
  nestedSelection,
  parseArgsAndSelection,
} from './sql-builder.js';
import type {
  ParsedSqlMapping,
  SqlClient,
  SqlDialect,
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

async function runSqlSelect(
  sqlClient: SqlClient,
  opts: {
    table: string;
    kind: SqlQueryKind;
    selection: ParsedSqlMapping;
    argsMapping: ParsedSqlMapping;
    graphqlArgs: Record<string, any>;
    parent: any;
    context: any;
  },
) {
  const { table, kind, selection, argsMapping, graphqlArgs, parent, context } = opts;
  const selectSelection = kind === 'CONNECTION' ? connectionNodeSelection(selection) : selection;

  // Batch ROW / simple ROWS when there is exactly one equality binder (FK / PK).
  if (kind === 'ROW' || kind === 'ROWS') {
    const column = batchableEqualityColumn(argsMapping);
    if (column) {
      const key = resolveEqualityKey(argsMapping, column, graphqlArgs, parent);
      if (key !== undefined) {
        return loadBatchedByColumn(
          context,
          {
            client: sqlClient,
            table,
            kind,
            selection: selectSelection,
            argsMapping,
            column,
            graphqlArgs,
          },
          key,
        );
      }
    }
  }

  const query = buildSelect(sqlClient.dialect, {
    table,
    kind,
    selection: selectSelection,
    argsMapping,
    graphqlArgs,
    parent,
  });
  const result = await sqlClient.query(query.sql, query.params);

  if (kind === 'COUNT') {
    const row = result.rows[0] as Record<string, unknown> | undefined;
    const count = row?.count ?? row?.COUNT ?? Object.values(row || {})[0] ?? 0;
    return Number(count);
  }
  if (kind === 'ROW') {
    const row = result.rows[0] as Record<string, unknown> | undefined;
    return row ? mapRowToGraphql(row, selectSelection) : null;
  }
  if (kind === 'CONNECTION') {
    const first = Number(graphqlArgs.first ?? 10);
    const after = typeof graphqlArgs.after === 'string' ? graphqlArgs.after : '';
    const offset = after ? decodeCursor(after) : 0;
    const rows = result.rows as Record<string, unknown>[];
    const hasNextPage = rows.length > first;
    const pageRows = hasNextPage ? rows.slice(0, first) : rows;
    const nodes = pageRows.map(r => mapRowToGraphql(r, selectSelection));
    const edges = nodes.map((node, i) => ({
      cursor: encodeCursor(offset + i),
      node,
    }));
    const endCursor = edges.length ? edges[edges.length - 1].cursor : null;
    const startCursor = edges.length ? edges[0].cursor : null;

    let totalCount = offset + pageRows.length + (hasNextPage ? 1 : 0);
    if (selection.entries.some(e => e.key === 'totalCount')) {
      const countQ = buildSelect(sqlClient.dialect, {
        table,
        kind: 'COUNT',
        selection: selectSelection,
        argsMapping,
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
    mapRowToGraphql(r, selectSelection),
  );
}

export function getSqlExecutor({ subgraph, cwd, client }: GetSqlExecutorOpts): DisposableExecutor {
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
    resolveConnectionStringFromEnv(undefined, { dialect: transport.options?.dialect });
  const dialect: SqlDialect =
    transport.options?.dialect || inferDialectFromLocation(location) || 'sqlite';
  if (!location) {
    throw new Error(
      '@transport(kind: "sql") requires location (connection URI / file path) or a Bun-compatible env URL (DATABASE_URL, POSTGRES_URL, MYSQL_URL, SQLITE_URL, …)',
    );
  }

  const sqlClient =
    client ||
    createSqlClient({
      dialect,
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
            const { argsMapping, selection } = parseArgsAndSelection(
              directive.args.args,
              directive.args.selection,
            );

            if (MUTATION_KINDS.has(kind)) {
              const mutationKind = kind as SqlMutationKind;
              fieldConfig.resolve = async function sqlMutationResolver(_root, args) {
                if (mutationKind === 'DELETE') {
                  const query = buildDelete(sqlClient.dialect, table, argsMapping, args);
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
                    ? buildInsert(sqlClient.dialect, table, argsMapping, args, returningCols)
                    : buildUpdate(sqlClient.dialect, table, argsMapping, args, returningCols);

                let row: Record<string, unknown> | undefined;
                if (returningCols.length && (dialect === 'sqlite' || dialect === 'postgres')) {
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
            fieldConfig.resolve = async function sqlQueryResolver(root, args, context) {
              return runSqlSelect(sqlClient, {
                table,
                kind: queryKind,
                selection,
                argsMapping,
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
      const { argsMapping, selection } = parseArgsAndSelection(
        sqlArgs.args as string | undefined,
        sqlArgs.selection as string | undefined,
      );
      return runSqlSelect(sqlClient, {
        table,
        kind: 'ROW',
        selection,
        argsMapping,
        graphqlArgs: {},
        parent: reference,
        context,
      });
    },
  });

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
