import type { GraphQLSchema } from 'graphql';
import { createDefaultExecutor, type DisposableExecutor } from '@graphql-mesh/transport-common';
import { getDefDirectives } from '@graphql-mesh/utils';
import { getDirective, MapperKind, mapSchema } from '@graphql-tools/utils';
import { DisposableSymbols } from '@whatwg-node/disposablestack';
import { createSqlClient } from './client.js';
import { inferDialectFromLocation } from './dialect.js';
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
  SqlMutationKind,
  SqlQueryKind,
} from './types.js';

export interface GetSqlExecutorOpts {
  subgraph: GraphQLSchema;
  cwd?: string;
  client?: SqlClient;
}

function connectionNodeSelection(selection: ParsedSqlMapping): ParsedSqlMapping {
  const nodes = nestedSelection(selection, 'nodes');
  if (nodes.entries.length) return nodes;
  const edgeNode = nestedSelection(nestedSelection(selection, 'edges'), 'node');
  if (edgeNode.entries.length) return edgeNode;
  return selection;
}

export function getSqlExecutor({ subgraph, cwd, client }: GetSqlExecutorOpts): DisposableExecutor {
  const transportDirectives = getDirective(subgraph, subgraph, 'transport');
  if (!transportDirectives?.length) {
    throw new Error('No @transport directive found on SQL subgraph schema');
  }
  const transport = transportDirectives[0] as {
    location?: string;
    options?: { dialect?: SqlDialect };
  };
  const dialect: SqlDialect =
    transport.options?.dialect || inferDialectFromLocation(transport.location) || 'sqlite';
  if (!transport.location) {
    throw new Error('@transport(kind: "sql") requires location (connection URI or file path)');
  }

  const sqlClient = client || createSqlClient({ dialect, location: transport.location, cwd });

  subgraph = mapSchema(subgraph, {
    [MapperKind.OBJECT_FIELD](fieldConfig) {
      const directives = getDefDirectives(subgraph, fieldConfig);
      for (const directive of directives) {
        switch (directive.name) {
          case 'sql__query': {
            const table = directive.args.table as string;
            const kind = (directive.args.kind || 'ROWS') as SqlQueryKind;
            const { argsMapping, selection } = parseArgsAndSelection(
              directive.args.args,
              directive.args.selection,
            );
            fieldConfig.resolve = async function sqlQueryResolver(root, args) {
              const selectSelection =
                kind === 'CONNECTION' ? connectionNodeSelection(selection) : selection;
              const query = buildSelect(sqlClient.dialect, {
                table,
                kind,
                selection: selectSelection,
                argsMapping,
                graphqlArgs: args,
                parent: root,
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
                const first = Number(args.first ?? 10);
                const after = typeof args.after === 'string' ? args.after : '';
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
                    graphqlArgs: args,
                    parent: root,
                  });
                  const countRes = await sqlClient.query(countQ.sql, countQ.params);
                  const crow = countRes.rows[0] as Record<string, unknown> | undefined;
                  totalCount = Number(
                    crow?.count ?? crow?.COUNT ?? Object.values(crow || {})[0] ?? 0,
                  );
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
            };
            break;
          }
          case 'sql__relation': {
            const table = directive.args.table as string;
            const kind = (directive.args.kind || 'ROW') as SqlQueryKind;
            const { argsMapping, selection } = parseArgsAndSelection(
              directive.args.args,
              directive.args.selection,
            );
            fieldConfig.resolve = async function sqlRelationResolver(root, args) {
              const query = buildSelect(sqlClient.dialect, {
                table,
                kind: kind === 'ROWS' ? 'ROWS' : 'ROW',
                selection,
                argsMapping,
                graphqlArgs: args,
                parent: root,
              });
              const result = await sqlClient.query(query.sql, query.params);
              if (kind === 'ROWS') {
                return (result.rows as Record<string, unknown>[]).map(r =>
                  mapRowToGraphql(r, selection),
                );
              }
              const row = result.rows[0] as Record<string, unknown> | undefined;
              return row ? mapRowToGraphql(row, selection) : null;
            };
            break;
          }
          case 'sql__mutation': {
            const table = directive.args.table as string;
            const kind = directive.args.kind as SqlMutationKind;
            const { argsMapping, selection } = parseArgsAndSelection(
              directive.args.args,
              directive.args.selection,
            );
            fieldConfig.resolve = async function sqlMutationResolver(_root, args) {
              if (kind === 'DELETE') {
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
                kind === 'INSERT'
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
        }
      }
      return fieldConfig;
    },
  });

  const defaultExecutor = createDefaultExecutor(subgraph);
  const executor: DisposableExecutor = async function sqlExecutor(executionRequest) {
    return defaultExecutor(executionRequest);
  };
  executor[DisposableSymbols.dispose] = () => sqlClient.dispose();
  executor[DisposableSymbols.asyncDispose] = async () => sqlClient.dispose();
  return executor;
}
