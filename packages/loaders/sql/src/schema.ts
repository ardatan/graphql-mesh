import {
  GraphQLBoolean,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
  type GraphQLSchema,
} from 'graphql';
import { SchemaComposer } from 'graphql-compose';
import {
  GraphQLBigInt,
  GraphQLByte,
  GraphQLDate,
  GraphQLDateTime,
  GraphQLJSON,
} from 'graphql-scalars';
import type { Pool as PgPool } from 'pg';
import { path as pathHelper } from '@graphql-mesh/cross-helpers';
import {
  inferAdapterFromConnectionString,
  resolveConnectionStringFromEnv,
  type SqlAdapter,
  type SqlTransportOptions,
} from '@graphql-mesh/transport-sql';
import { SqlDirective, SqlKindEnum, TransportDirective } from './directives.js';
import { graphqlFieldNameForColumn } from './field-names.js';
import { introspectMysql } from './introspect/mysql.js';
import { introspectPostgres } from './introspect/postgres.js';
import { introspectSqlite } from './introspect/sqlite.js';
import type {
  SqlColumnMeta,
  SqlComputedColumnMeta,
  SqlForeignKeyMeta,
  SqlSchemaMeta,
  SqlTableMeta,
} from './introspect/types.js';
import { createDefaultNaming, type SqlNaming } from './naming.js';
import { mapSqlTypeToGraphQL } from './type-map.js';

function colFieldName(
  naming: SqlNaming,
  col: SqlColumnMeta,
  solePk: SqlColumnMeta | undefined,
  table: SqlTableMeta,
): string {
  return graphqlFieldNameForColumn(naming, col, solePk, table.columns);
}

function colFieldNameBySql(
  naming: SqlNaming,
  sqlCol: string,
  solePk: SqlColumnMeta | undefined,
  table: SqlTableMeta,
): string {
  const col = table.columns.find(c => c.name === sqlCol);
  if (!col) {
    return solePk && sqlCol === solePk.name
      ? graphqlFieldNameForColumn(naming, solePk, solePk, table.columns)
      : naming.fieldName(sqlCol);
  }
  return colFieldName(naming, col, solePk, table);
}

const FEDERATION_LINK_URL = 'https://specs.apollo.dev/federation/v2.6';

/**
 * Options for {@link loadSqlSubgraph} / {@link loadGraphQLSchemaFromSql}.
 *
 * Forwarded onto `@transport(kind: "sql", options:)`: `max`, `idleTimeout`,
 * `connectionTimeout`, `tls`, `ssl`, `schema`, `softDelete`.
 * Not forwarded: `pgPool` (introspection-only). For runtime reuse of the same
 * pool, wrap it and pass it to `getSqlExecutor`.
 *
 * @example
 * ```ts
 * import { loadSqlSubgraph } from '@omnigraph/sql';
 *
 * const shop = loadSqlSubgraph('shop', {
 *   endpoint: 'postgres://localhost:5432/shop',
 *   schema: 'public',
 *   max: 10,
 *   includeTables: ['albums', 'artists'],
 *   softDelete: { column: 'deleted_at' },
 * });
 * ```
 * @example
 * ```ts
 * // SQLite file (URI becomes `@transport(location)`)
 * loadSqlSubgraph('chinook', { endpoint: 'file:./chinook.db' })
 * ```
 * @example
 * ```ts
 * // pgPool: introspection only (not stamped onto @transport(options)).
 * // max/tls/ssl/schema still forward when set alongside an endpoint.
 * // Runtime with the same pool: wrap + getSqlExecutor (no DB URL required).
 * import {
 *   getSqlExecutor,
 *   loadGraphQLSchemaFromSql,
 *   wrapPgPoolAsSqlClient,
 * } from '@omnigraph/sql';
 *
 * const subgraph = await loadGraphQLSchemaFromSql('shop', {
 *   pgPool: myPool,
 *   schema: 'app',
 * });
 * const executor = await getSqlExecutor({
 *   subgraph,
 *   client: wrapPgPoolAsSqlClient(myPool, { schema: 'app' }),
 * });
 * ```
 */
export interface LoadSqlSubgraphOpts extends Pick<
  SqlTransportOptions,
  'max' | 'idleTimeout' | 'connectionTimeout' | 'tls' | 'ssl' | 'schema'
> {
  /**
   * Explicit adapter override. When omitted, inferred from the connection URI
   * protocol (`postgres://`, `mysql://` / `mysql2://` / `mariadb://`,
   * `sqlite://` / `file:`, host-style → postgres, `*.db` → sqlite).
   *
   * @example 'mysql'
   */
  adapter?: SqlAdapter;
  /**
   * Connection URI / path — becomes `@transport(location)`.
   * When omitted, resolved from env URLs (`DATABASE_URL`, `POSTGRES_URL` / `PGURL`,
   * `MYSQL_URL`, `SQLITE_URL`, …) or `PG*` / `MYSQL_*` fields.
   * Sqlite: `file:…`, `sqlite:…`, `:memory:`, or a `*.db` path.
   * Mysql/Postgres: `mysql(2|s)://…`, `mariadb://…`, `postgres(ql)://…`, or host-style.
   *
   * @example 'postgres://user:pass@localhost:5432/shop'
   * @example 'mysql://root@127.0.0.1:3306/employees'
   * @example 'file:./chinook.db'
   */
  endpoint?: string;
  /**
   * Base directory for relative sqlite paths when normalizing `endpoint` into
   * `@transport(location)` (`file:…` / bare `*.db`). Absolute paths and
   * `:memory:` / `sqlite:…` are left unchanged.
   *
   * @default process.cwd()
   * @example '/app/data'
   */
  cwd?: string;
  /**
   * Only introspect these SQL tables (others omitted from the GraphQL schema).
   * Useful to keep compose schemas small when the database has many tables.
   *
   * @example ['albums', 'artists', 'tracks']
   */
  includeTables?: string[];
  /**
   * Drop these SQL tables from introspection even when otherwise included
   * (migrations / internal tables).
   *
   * @example ['schema_migrations']
   */
  excludeTables?: string[];
  /**
   * Limit columns per table (legacy mysql `tableFields` shape). Columns not
   * listed are omitted from GraphQL types and `@sql(selection:)` mappings.
   *
   * @example [{ table: 'employees', fields: ['emp_no', 'first_name', 'last_name'] }]
   */
  tableFields?: Array<{ table: string; fields: string[] }>;
  /**
   * Partial override of GraphQL naming helpers (type / field / filter names).
   * Unspecified hooks keep {@link createDefaultNaming}.
   *
   * @example { typeName: t => t.replace(/s$/, '') }
   */
  naming?: Partial<SqlNaming>;
  /**
   * Soft-delete: hide rows where `column IS NOT NULL`; `delete*` mutations set
   * the column to now instead of hard `DELETE`. Forwarded to `@transport(options)`.
   *
   * @example { column: 'deleted_at', tables: ['albums'] }
   */
  softDelete?: SqlTransportOptions['softDelete'];
  /**
   * Existing `pg.Pool` for Postgres **introspection** only (TLS / custom dial).
   * Not forwarded to `@transport(options)` (unlike `max`, `tls`, `ssl`, `schema`).
   * Runtime uses `@transport(location)` or an injected executor client via
   * `wrapPgPoolAsSqlClient` + `getSqlExecutor`. When set, `endpoint` may be
   * omitted for pool-only Mesh configs that inject their own execution client.
   * `@transport(location)` uses `endpoint` or `pool.options.connectionString`
   * when present; never a placeholder URI.
   *
   * @example myPool
   */
  pgPool?: PgPool;
}

/**
 * Introspect + emit a GraphQL schema with `@sql` mappings and
 * `@transport(kind: "sql", location, options)`.
 *
 * Prefer {@link loadSqlSubgraph} from Mesh compose; call this directly when you
 * need the schema object (tests, custom executors).
 *
 * @example
 * ```ts
 * const schema = await loadGraphQLSchemaFromSql('shop', {
 *   endpoint: 'postgres://localhost/shop',
 *   includeTables: ['albums'],
 * });
 * ```
 */
export async function loadGraphQLSchemaFromSql(subgraphName: string, opts: LoadSqlSubgraphOpts) {
  const naming: SqlNaming = { ...createDefaultNaming(), ...opts.naming };
  const withEndpoint = resolveOptsEndpoint(opts);
  const adapter = resolveAdapter(withEndpoint);
  const resolved: LoadSqlSubgraphOpts & { adapter: SqlAdapter } = {
    ...withEndpoint,
    adapter,
  };
  const meta = applyTableFieldsFilter(await introspect(resolved), opts.tableFields);
  const location = resolveLocation(resolved); // may be undefined for pgPool-only + injected client
  const schemaComposer = new SchemaComposer();

  schemaComposer.add(GraphQLBigInt);
  schemaComposer.add(GraphQLByte);
  schemaComposer.add(GraphQLJSON);
  schemaComposer.add(GraphQLDate);
  schemaComposer.add(GraphQLDateTime);
  schemaComposer.addDirective(TransportDirective);
  schemaComposer.addDirective(SqlDirective);
  schemaComposer.add(SqlKindEnum);

  ensureSharedFilterInputs(schemaComposer);
  ensurePageInfo(schemaComposer);

  const tableByName = new Map(meta.tables.map(t => [t.name, t]));
  const typeNameByTable = new Map(meta.tables.map(t => [t.name, naming.typeName(t.name)] as const));
  const computedByTable = new Map<string, NonNullable<typeof meta.computedColumns>>();
  for (const cc of meta.computedColumns || []) {
    let list = computedByTable.get(cc.table);
    if (!list) {
      list = [];
      computedByTable.set(cc.table, list);
    }
    list.push(cc);
  }

  // Pass 1: object types + column fields
  for (const table of meta.tables) {
    const typeName = typeNameByTable.get(table.name)!;
    const pkCols = table.columns.filter(c => c.primaryKey);
    const solePk = pkCols.length === 1 ? pkCols[0] : undefined;
    const computed = computedByTable.get(table.name) || [];

    const otc = schemaComposer.createObjectTC({
      name: typeName,
      fields: {},
    });
    const typeDirectives: Array<{ name: string; args: Record<string, unknown> }> = [];
    // Type-level `@sql` = entity resolver (`$this` keys). Federation `@key` only
    // when the table has a primary key (empty `@key(fields: "")` is invalid).
    if (pkCols.length) {
      typeDirectives.push({
        name: 'key',
        args: {
          fields: solePk
            ? colFieldName(naming, solePk, solePk, table)
            : pkCols.map(c => colFieldName(naming, c, undefined, table)).join(' '),
        },
      });
      const keyArgs = pkCols
        .map(col => {
          const field = colFieldName(naming, col, solePk, table);
          return `${col.name}: $this.${field}`;
        })
        .join('\n');
      typeDirectives.push({
        name: 'sql',
        args: {
          subgraph: subgraphName,
          table: table.name,
          kind: 'ROW',
          where: blockArg(keyArgs),
          selection: selectionBlock(naming, table, computed),
        },
      });
    }
    otc.setDirectives(typeDirectives);

    for (const col of table.columns) {
      const isSolePkCol = Boolean(solePk && col.name === solePk.name);
      const fieldName = colFieldName(naming, col, solePk, table);
      const gqlType = mapSqlTypeToGraphQL(col.dataType, { asId: isSolePkCol });
      // Output nullability follows the database column — do not force sole PK non-null.
      otc.setField(fieldName, {
        type: col.notNull ? new GraphQLNonNull(gqlType) : gqlType,
      });
    }

    // Postgres computed columns (`users_full_name(users)` → `fullName`)
    for (const cc of computed) {
      if (otc.hasField(cc.fieldName)) continue;
      const gqlType = mapSqlTypeToGraphQL(cc.returnType);
      otc.setField(cc.fieldName, { type: gqlType });
    }

    createFilterAndOrder(schemaComposer, naming, typeName, table, solePk);
    createConnectionTypes(schemaComposer, typeName);
    createMutationInputs(schemaComposer, naming, typeName, table, solePk);
  }

  // Pass 2: relations
  for (const table of meta.tables) {
    const typeName = typeNameByTable.get(table.name)!;
    const otc = schemaComposer.getOTC(typeName);
    const solePk = table.columns.filter(c => c.primaryKey);
    const solePkCol = solePk.length === 1 ? solePk[0] : undefined;

    for (const fk of table.foreignKeys) {
      if (fk.columns.length !== 1 || fk.refColumns.length !== 1) continue;
      const refTable = tableByName.get(fk.refTable);
      if (!refTable) continue;
      const refTypeName = typeNameByTable.get(fk.refTable)!;
      const localCol = fk.columns[0];
      const refCol = fk.refColumns[0];
      const localField = colFieldNameBySql(naming, localCol, solePkCol, table);
      const refSolePk = refTable.columns.filter(c => c.primaryKey);
      const refSolePkCol = refSolePk.length === 1 ? refSolePk[0] : undefined;
      const refField = colFieldNameBySql(naming, refCol, refSolePkCol, refTable);

      // belongsTo on local table (second FK to same ref → name from local column)
      const belongsToName = uniqueRelationFieldName(
        naming.singularField(refTypeName),
        localCol,
        naming,
        name => otc.hasField(name),
      );
      if (belongsToName) {
        otc.setField(belongsToName, {
          type: refTypeName,
          directives: [
            {
              name: 'sql',
              args: {
                subgraph: subgraphName,
                table: fk.refTable,
                kind: 'ROW',
                where: blockArg(`${refCol}: $this.${localField}`),
                selection: selectionBlock(
                  naming,
                  refTable,
                  computedByTable.get(refTable.name) || [],
                ),
              },
            },
          ],
        });
      }

      // hasMany on referenced table
      const refOtc = schemaComposer.getOTC(refTypeName);
      const hasManyName = uniqueRelationFieldName(
        naming.pluralField(typeName),
        localCol,
        naming,
        name => refOtc.hasField(name),
        { pluralizeStem: true },
      );
      if (hasManyName) {
        refOtc.setField(hasManyName, {
          type: `[${typeName}!]!`,
          args: {
            where: naming.filterInput(typeName),
            orderBy: `[${naming.orderByEnum(typeName)}!]`,
            limit: 'Int',
            offset: 'Int',
          },
          directives: [
            {
              name: 'sql',
              args: {
                subgraph: subgraphName,
                table: table.name,
                kind: 'ROWS',
                // Spread only when merging fixed join predicates with client where.
                where: blockArg(`${localCol}: $this.${refField}\n...$args.where`),
                orderBy: '$args.orderBy',
                limit: '$args.limit',
                offset: '$args.offset',
                selection: selectionBlock(naming, table, computedByTable.get(table.name) || []),
              },
            },
          ],
        });
      }

      // Nested belongs-to filter: AlbumFilter.artist → ArtistFilter
      const localFilter = schemaComposer.getITC(naming.filterInput(typeName));
      if (belongsToName && !localFilter.hasField(belongsToName)) {
        localFilter.setField(belongsToName, {
          type: naming.filterInput(refTypeName),
        });
      }
    }
  }

  // Pass 2b: many-to-many shortcuts through junction tables
  for (const edge of findManyToManyEdges(meta.tables)) {
    emitManyToManyField({
      schemaComposer,
      naming,
      subgraphName,
      tableByName,
      typeNameByTable,
      computedByTable,
      leftTableName: edge.leftTable,
      rightTableName: edge.rightTable,
      junction: edge.junction,
      leftFk: edge.leftFk,
      rightFk: edge.rightFk,
    });
    emitManyToManyField({
      schemaComposer,
      naming,
      subgraphName,
      tableByName,
      typeNameByTable,
      computedByTable,
      leftTableName: edge.rightTable,
      rightTableName: edge.leftTable,
      junction: edge.junction,
      leftFk: edge.rightFk,
      rightFk: edge.leftFk,
    });
  }

  // Pass 3: Query + Mutation roots
  const queryTC = schemaComposer.Query;
  const mutationTC = schemaComposer.Mutation;

  for (const table of meta.tables) {
    const typeName = typeNameByTable.get(table.name)!;
    const pkCols = table.columns.filter(c => c.primaryKey);
    const solePk = pkCols.length === 1 ? pkCols[0] : undefined;
    const selectionRaw = selectionLines(naming, table, computedByTable.get(table.name) || []);
    const selection = blockArg(selectionRaw);
    const plural = naming.pluralField(typeName);
    const singular = naming.singularField(typeName);

    if (solePk) {
      const pkField = colFieldName(naming, solePk, solePk, table);
      queryTC.setField(singular, {
        type: typeName,
        args: {
          [pkField]: 'ID!',
        },
        directives: [
          {
            name: 'sql',
            args: {
              subgraph: subgraphName,
              table: table.name,
              kind: 'ROW',
              where: blockArg(`${solePk.name}: $args.${pkField}`),
              selection,
            },
          },
        ],
      });
    }

    queryTC.setField(plural, {
      type: `[${typeName}!]!`,
      args: {
        where: naming.filterInput(typeName),
        orderBy: `[${naming.orderByEnum(typeName)}!]`,
        limit: { type: GraphQLInt, defaultValue: 10 },
        offset: { type: GraphQLInt, defaultValue: 0 },
      },
      directives: [
        {
          name: 'sql',
          args: {
            subgraph: subgraphName,
            table: table.name,
            kind: 'ROWS',
            // Sole binder: bare `$args.where` (no spread needed).
            where: '$args.where',
            orderBy: '$args.orderBy',
            limit: '$args.limit',
            offset: '$args.offset',
            selection,
          },
        },
      ],
    });

    queryTC.setField(naming.connectionField(typeName), {
      type: `${typeName}Connection!`,
      args: {
        where: naming.filterInput(typeName),
        orderBy: `[${naming.orderByEnum(typeName)}!]`,
        first: GraphQLInt,
        after: GraphQLString,
      },
      directives: [
        {
          name: 'sql',
          args: {
            subgraph: subgraphName,
            table: table.name,
            kind: 'CONNECTION',
            where: '$args.where',
            orderBy: '$args.orderBy',
            first: '$args.first',
            after: '$args.after',
            selection: blockArg(
              [
                `nodes {`,
                indent(selectionRaw),
                `}`,
                `edges {`,
                `  cursor: $cursor`,
                `  node {`,
                indent(selectionRaw, 2),
                `  }`,
                `}`,
                `pageInfo {`,
                `  hasNextPage: $hasNextPage`,
                `  hasPreviousPage: $hasPreviousPage`,
                `  startCursor: $startCursor`,
                `  endCursor: $endCursor`,
                `}`,
                `totalCount: $totalCount`,
              ].join('\n'),
            ),
          },
        },
      ],
    });

    queryTC.setField(naming.countField(typeName), {
      type: 'Int!',
      args: {
        where: naming.filterInput(typeName),
      },
      directives: [
        {
          name: 'sql',
          args: {
            subgraph: subgraphName,
            table: table.name,
            kind: 'COUNT',
            where: '$args.where',
            selection: blockArg(`$`),
          },
        },
      ],
    });

    // Mutations
    const payloadKey = singular;
    const { createFields, updateFields } = mutationWritableColumns(naming, table, solePk);
    const hasCreateInput = Object.keys(createFields).length > 0;
    const hasUpdateInput = Object.keys(updateFields).length > 0;
    // Always emit create — empty writable set uses DEFAULT VALUES / `() VALUES ()`.
    const createArgs: Record<string, string> = {};
    if (hasCreateInput) {
      createArgs.input = `${naming.createInput(typeName)}!`;
    }
    mutationTC.setField(`create${typeName}`, {
      type: `${naming.payloadType(typeName)}!`,
      args: createArgs,
      directives: [
        {
          name: 'sql',
          args: {
            subgraph: subgraphName,
            table: table.name,
            kind: 'INSERT',
            set: hasCreateInput ? insertSetBlock(naming, table, solePk) : blockArg(''),
            selection: blockArg(`${payloadKey} {\n${indent(selectionRaw)}\n}`),
          },
        },
      ],
    });

    if (solePk) {
      const pkField = colFieldName(naming, solePk, solePk, table);
      // No writable columns → no update (would reference an empty input type).
      if (hasUpdateInput) {
        mutationTC.setField(`update${typeName}`, {
          type: `${naming.payloadType(typeName)}!`,
          args: {
            [pkField]: 'ID!',
            input: `${naming.updateInput(typeName)}!`,
          },
          directives: [
            {
              name: 'sql',
              args: {
                subgraph: subgraphName,
                table: table.name,
                kind: 'UPDATE',
                set: blockArg(updateSetBlock(naming, table, solePk)),
                where: blockArg(`${solePk.name}: $args.${pkField}`),
                selection: blockArg(`${payloadKey} {\n${indent(selectionRaw)}\n}`),
              },
            },
          ],
        });
      }

      mutationTC.setField(`delete${typeName}`, {
        type: `${naming.deletePayloadType(typeName)}!`,
        args: {
          [pkField]: 'ID!',
        },
        directives: [
          {
            name: 'sql',
            args: {
              subgraph: subgraphName,
              table: table.name,
              kind: 'DELETE',
              where: blockArg(`${solePk.name}: $args.${pkField}`),
              selection: blockArg([`ok: $affectedRows`, `affectedRows: $affectedRows`].join('\n')),
            },
          },
        ],
      });
    }
  }

  const schema = schemaComposer.buildSchema();
  const extensions: any = (schema.extensions ||= {});
  extensions.directives ||= {};
  // Use caller opts (not `resolved`) so inferred adapter is not stamped into
  // `@transport(options)` when `location` already implies the dialect.
  const transportOptions = buildTransportOptions(withEndpoint, adapter);
  extensions.directives.transport = {
    subgraph: subgraphName,
    kind: 'sql',
    ...(location ? { location } : {}),
    ...(Object.keys(transportOptions).length ? { options: transportOptions } : {}),
  };
  extensions.directives.link = [
    {
      url: FEDERATION_LINK_URL,
      import: ['@key'],
    },
  ];
  // graphql-compose emits StringValue without `block: true`, so printers escape
  // newlines as `\n`. Mark @sql args/selection as block strings for readable """ SDL.
  markSqlDirectiveStringsAsBlocks(schema);
  return schema;
}

async function introspect(
  opts: LoadSqlSubgraphOpts & { adapter: SqlAdapter },
): Promise<SqlSchemaMeta> {
  // Explicit empty allowlist is a configuration error (would emit an empty schema).
  if (Array.isArray(opts.includeTables) && opts.includeTables.length === 0) {
    throw new Error(
      'loadSqlSubgraph: includeTables: [] is empty; omit the option to include all tables',
    );
  }
  switch (opts.adapter) {
    case 'sqlite': {
      if (!opts.endpoint) {
        throw new Error(`loadSqlSubgraph sqlite requires endpoint (file:… / *.db)`);
      }
      return introspectSqlite({
        db: opts.endpoint,
        cwd: opts.cwd,
        includeTables: opts.includeTables,
        excludeTables: opts.excludeTables,
      });
    }
    case 'mysql': {
      if (!opts.endpoint) {
        throw new Error(`loadSqlSubgraph mysql requires endpoint (mysql://…)`);
      }
      return introspectMysql({
        connectionString: opts.endpoint,
        includeTables: opts.includeTables,
        excludeTables: opts.excludeTables,
        tls: opts.tls,
        ssl: opts.ssl,
      });
    }
    case 'postgres': {
      if (!opts.endpoint && !opts.pgPool) {
        throw new Error(`loadSqlSubgraph postgres requires endpoint (postgres://…) or pgPool`);
      }
      return introspectPostgres({
        connectionString: opts.endpoint,
        pool: opts.pgPool,
        schema: opts.schema,
        includeTables: opts.includeTables,
        excludeTables: opts.excludeTables,
        tls: opts.tls,
        ssl: opts.ssl,
      });
    }
    default:
      throw new Error(`Unknown SQL adapter: ${(opts as any).adapter}`);
  }
}

/**
 * Fill `endpoint` from env URLs when omitted.
 */
export function resolveOptsEndpoint(opts: LoadSqlSubgraphOpts): LoadSqlSubgraphOpts {
  if (opts.endpoint) return opts;
  const fromPool =
    opts.pgPool &&
    typeof (opts.pgPool as { options?: { connectionString?: string } }).options === 'object'
      ? (opts.pgPool as { options?: { connectionString?: string } }).options?.connectionString
      : undefined;
  if (fromPool && String(fromPool).trim()) {
    return { ...opts, endpoint: String(fromPool) };
  }
  // Pool-only without a URI: keep endpoint unset. Callers that inject an execution
  // client do not need `@transport(location)`. Do not stamp a placeholder
  // `postgres://` — the standard transport would dial wrong.
  if (opts.pgPool) {
    return opts;
  }
  const fromEnv = resolveConnectionStringFromEnv(undefined, { adapter: opts.adapter });
  if (!fromEnv) {
    throw new Error(
      'loadSqlSubgraph requires endpoint or an env URL (DATABASE_URL, POSTGRES_URL, MYSQL_URL, SQLITE_URL, …)',
    );
  }
  return { ...opts, endpoint: fromEnv };
}

/**
 * Resolve adapter: explicit `adapter` wins; otherwise protocol detection from
 * `endpoint` (or env-resolved endpoint). `pgPool` alone implies postgres.
 */
export function resolveAdapter(opts: LoadSqlSubgraphOpts): SqlAdapter {
  if (opts.adapter) return opts.adapter;
  if (opts.pgPool && !opts.endpoint) return 'postgres';
  const endpoint = opts.endpoint || resolveConnectionStringFromEnv();
  if (!endpoint) {
    throw new Error('loadSqlSubgraph requires adapter or endpoint (or DATABASE_URL / …)');
  }
  return inferAdapterFromConnectionString(endpoint);
}

function buildTransportOptions(
  opts: LoadSqlSubgraphOpts,
  adapter: SqlAdapter,
): SqlTransportOptions {
  // Only stamp `adapter` when the caller set it explicitly. Runtime already
  // infers from `@transport(location)` (`postgres://`, `mysql://`, `file:…`, …).
  const options: SqlTransportOptions = {};
  if (opts.adapter) options.adapter = adapter;
  if (opts.max != null) options.max = opts.max;
  if (opts.idleTimeout != null) options.idleTimeout = opts.idleTimeout;
  if (opts.connectionTimeout != null) options.connectionTimeout = opts.connectionTimeout;
  if (opts.tls != null) options.tls = opts.tls;
  if (opts.ssl) options.ssl = opts.ssl;
  if (opts.schema) options.schema = opts.schema;
  if (opts.softDelete?.column) options.softDelete = opts.softDelete;
  return options;
}

function resolveLocation(opts: LoadSqlSubgraphOpts): string | undefined {
  const raw = opts.endpoint;
  if (!raw) {
    // Pool-only introspection: schema may omit `@transport(location)` when the
    // caller injects the runtime client. Standard transport still needs a URI.
    if (opts.pgPool) return undefined;
    throw new Error('SQL loader requires endpoint');
  }
  // Normalize relative sqlite paths to absolute file: / sqlite: URIs for @transport(location).
  try {
    if (inferAdapterFromConnectionString(raw) === 'sqlite') {
      const cwd = opts.cwd || process.cwd();
      if (raw === ':memory:') return raw;
      if (raw.toLowerCase().startsWith('sqlite:')) {
        const rest = raw.slice(raw.indexOf(':') + 1);
        if (!rest || rest === ':memory:' || pathHelper.isAbsolute(rest)) return raw;
        return `sqlite:${pathHelper.join(cwd, rest)}`;
      }
      if (raw.toLowerCase().startsWith('file:')) {
        const rest = raw.slice('file:'.length).replace(/^\/\/+/, '/');
        if (pathHelper.isAbsolute(rest) || rest === ':memory:') return raw;
        return `file:${pathHelper.join(cwd, rest)}`;
      }
      const abs = pathHelper.isAbsolute(raw) ? raw : pathHelper.join(cwd, raw);
      return `file:${abs}`;
    }
  } catch {
    // non-sqlite / unknown — return as given
  }
  return raw;
}

/** Prefer `preferred`; on collision, derive an alternate from the FK column stem. */
function uniqueRelationFieldName(
  preferred: string,
  localCol: string,
  naming: SqlNaming,
  taken: (name: string) => boolean,
  opts?: { pluralizeStem?: boolean },
): string | null {
  if (!taken(preferred)) return preferred;
  const stem = localCol.replace(/_id$/i, '').replace(/Id$/, '') || localCol;
  const alt = opts?.pluralizeStem
    ? naming.pluralField(naming.typeName(stem))
    : naming.fieldName(stem);
  if (alt && alt !== preferred && !taken(alt)) return alt;
  return null;
}

function applyTableFieldsFilter(
  meta: SqlSchemaMeta,
  tableFields?: Array<{ table: string; fields: string[] }>,
): SqlSchemaMeta {
  if (!tableFields?.length) return meta;
  const allow = new Map(tableFields.map(tf => [tf.table, new Set(tf.fields)]));
  return {
    ...meta,
    tables: meta.tables.map(table => {
      const fields = allow.get(table.name);
      if (!fields) return table;
      const fkCols = new Set(table.foreignKeys.flatMap(fk => fk.columns));
      return {
        ...table,
        // Always keep PK, FK (for `$this` binders), and NOT NULL insert-required
        // columns so tableFields cannot silently break relations or creates.
        columns: table.columns.filter(
          c =>
            fields.has(c.name) ||
            c.primaryKey ||
            fkCols.has(c.name) ||
            (c.notNull && !c.autoIncrement && !c.hasDefault && !c.generated),
        ),
      };
    }),
  };
}

/**
 * Junction with exactly two single-column FKs to two different tables.
 * Extra payload columns are fine — junction type stays; we still emit shortcuts.
 */
function findManyToManyEdges(tables: SqlTableMeta[]): Array<{
  junction: SqlTableMeta;
  leftTable: string;
  rightTable: string;
  leftFk: SqlForeignKeyMeta;
  rightFk: SqlForeignKeyMeta;
}> {
  const known = new Set(tables.map(t => t.name));
  const out: Array<{
    junction: SqlTableMeta;
    leftTable: string;
    rightTable: string;
    leftFk: SqlForeignKeyMeta;
    rightFk: SqlForeignKeyMeta;
  }> = [];

  for (const table of tables) {
    const fks = table.foreignKeys.filter(
      fk => fk.columns.length === 1 && fk.refColumns.length === 1 && known.has(fk.refTable),
    );
    if (fks.length !== 2) continue;
    const [a, b] = fks;
    if (a.refTable === b.refTable) continue; // self-M2M: skip short-name shortcuts for now

    // Classic junction / dept_emp: composite PK is exactly the two FK columns
    // (excludes line-item tables with a surrogate PK like invoice_items).
    const pkCols = table.columns.filter(c => c.primaryKey).map(c => c.name);
    const fkColSet = new Set([...a.columns, ...b.columns]);
    if (pkCols.length !== 2 || pkCols.some(c => !fkColSet.has(c))) continue;

    out.push({
      junction: table,
      leftTable: a.refTable,
      rightTable: b.refTable,
      leftFk: a,
      rightFk: b,
    });
  }
  return out;
}

function emitManyToManyField(opts: {
  schemaComposer: SchemaComposer;
  naming: SqlNaming;
  subgraphName: string;
  tableByName: Map<string, SqlTableMeta>;
  typeNameByTable: Map<string, string>;
  computedByTable: Map<string, NonNullable<SqlSchemaMeta['computedColumns']>>;
  leftTableName: string;
  rightTableName: string;
  junction: SqlTableMeta;
  leftFk: SqlForeignKeyMeta;
  rightFk: SqlForeignKeyMeta;
}) {
  const {
    schemaComposer,
    naming,
    subgraphName,
    tableByName,
    typeNameByTable,
    computedByTable,
    leftTableName,
    rightTableName,
    junction,
    leftFk,
    rightFk,
  } = opts;

  const leftTable = tableByName.get(leftTableName);
  const rightTable = tableByName.get(rightTableName);
  if (!leftTable || !rightTable) return;

  const leftTypeName = typeNameByTable.get(leftTableName)!;
  const rightTypeName = typeNameByTable.get(rightTableName)!;
  const junctionTypeName = typeNameByTable.get(junction.name)!;
  const leftOtc = schemaComposer.getOTC(leftTypeName);

  const leftRefCol = leftFk.refColumns[0];
  const leftSolePk = leftTable.columns.filter(c => c.primaryKey);
  const leftSolePkCol = leftSolePk.length === 1 ? leftSolePk[0] : undefined;
  const leftPkField = colFieldNameBySql(naming, leftRefCol, leftSolePkCol, leftTable);

  const shortName = naming.pluralField(rightTypeName);
  const verboseName = naming.fieldName(
    `${shortName}_by_${junctionTypeName}_${leftFk.columns[0]}_and_${rightFk.columns[0]}`,
  );
  const fieldName = leftOtc.hasField(shortName) ? verboseName : shortName;
  if (leftOtc.hasField(fieldName)) return;

  const through = blockArg(
    [
      `table: ${junction.name}`,
      `local: ${leftFk.columns[0]}`,
      `remote: ${rightFk.columns[0]}`,
      `parent: $this.${leftPkField}`,
      `target: ${rightFk.refColumns[0]}`,
    ].join('\n'),
  );

  leftOtc.setField(fieldName, {
    type: `[${rightTypeName}!]!`,
    args: {
      where: naming.filterInput(rightTypeName),
      orderBy: `[${naming.orderByEnum(rightTypeName)}!]`,
      limit: 'Int',
      offset: 'Int',
    },
    directives: [
      {
        name: 'sql',
        args: {
          subgraph: subgraphName,
          table: rightTableName,
          kind: 'ROWS',
          through,
          where: '$args.where',
          orderBy: '$args.orderBy',
          limit: '$args.limit',
          offset: '$args.offset',
          selection: selectionBlock(naming, rightTable, computedByTable.get(rightTableName) || []),
        },
      },
    ],
  });

  // Nested M2M filter: PlaylistFilter.tracks → TrackFilter
  const leftFilter = schemaComposer.getITC(naming.filterInput(leftTypeName));
  if (!leftFilter.hasField(fieldName)) {
    leftFilter.setField(fieldName, {
      type: naming.filterInput(rightTypeName),
    });
  }
}

function ensureSharedFilterInputs(schemaComposer: SchemaComposer) {
  if (!schemaComposer.has('StringFilter')) {
    schemaComposer.createInputTC({
      name: 'StringFilter',
      fields: {
        eq: 'String',
        ne: 'String',
        in: '[String!]',
        nin: '[String!]',
        lt: 'String',
        lte: 'String',
        gt: 'String',
        gte: 'String',
        includes: 'String',
        startsWith: 'String',
        endsWith: 'String',
        like: 'String',
        ilike: 'String',
        isNull: 'Boolean',
      },
    });
  }
  if (!schemaComposer.has('IntFilter')) {
    schemaComposer.createInputTC({
      name: 'IntFilter',
      fields: {
        eq: 'Int',
        ne: 'Int',
        in: '[Int!]',
        nin: '[Int!]',
        lt: 'Int',
        lte: 'Int',
        gt: 'Int',
        gte: 'Int',
        isNull: 'Boolean',
      },
    });
  }
  if (!schemaComposer.has('BigIntFilter')) {
    schemaComposer.createInputTC({
      name: 'BigIntFilter',
      fields: {
        eq: 'BigInt',
        ne: 'BigInt',
        in: '[BigInt!]',
        nin: '[BigInt!]',
        lt: 'BigInt',
        lte: 'BigInt',
        gt: 'BigInt',
        gte: 'BigInt',
        isNull: 'Boolean',
      },
    });
  }
  if (!schemaComposer.has('BooleanFilter')) {
    schemaComposer.createInputTC({
      name: 'BooleanFilter',
      fields: {
        eq: 'Boolean',
        ne: 'Boolean',
        isNull: 'Boolean',
      },
    });
  }
}

function ensurePageInfo(schemaComposer: SchemaComposer) {
  if (!schemaComposer.has('PageInfo')) {
    schemaComposer.createObjectTC({
      name: 'PageInfo',
      fields: {
        hasNextPage: 'Boolean!',
        hasPreviousPage: 'Boolean!',
        startCursor: 'String',
        endCursor: 'String',
      },
    });
  }
}

function createFilterAndOrder(
  schemaComposer: SchemaComposer,
  naming: SqlNaming,
  typeName: string,
  table: SqlTableMeta,
  solePk?: SqlColumnMeta,
) {
  const filterFields: Record<string, string> = {
    and: `[${naming.filterInput(typeName)}!]`,
    or: `[${naming.filterInput(typeName)}!]`,
    not: naming.filterInput(typeName),
  };
  const orderValues: Record<string, { value: string }> = {};

  for (const col of table.columns) {
    const isSolePkCol = Boolean(solePk && col.name === solePk.name);
    const fieldName = colFieldName(naming, col, solePk, table);
    const gql = mapSqlTypeToGraphQL(col.dataType, { asId: isSolePkCol });
    const filterType =
      gql === GraphQLInt || gql.name === 'Int'
        ? 'IntFilter'
        : gql.name === 'BigInt'
          ? 'BigIntFilter'
          : gql === GraphQLBoolean
            ? 'BooleanFilter'
            : 'StringFilter';
    // Do not shadow boolean combinators with a column named `and` / `or` / `not`.
    if (fieldName !== 'and' && fieldName !== 'or' && fieldName !== 'not') {
      filterFields[fieldName] = filterType;
    }
    orderValues[naming.orderValue(fieldName, 'ASC')] = {
      value: naming.orderValue(fieldName, 'ASC'),
    };
    orderValues[naming.orderValue(fieldName, 'DESC')] = {
      value: naming.orderValue(fieldName, 'DESC'),
    };
  }

  schemaComposer.createInputTC({
    name: naming.filterInput(typeName),
    fields: filterFields,
  });
  schemaComposer.createEnumTC({
    name: naming.orderByEnum(typeName),
    values: orderValues,
  });
}

function createConnectionTypes(schemaComposer: SchemaComposer, typeName: string) {
  if (!schemaComposer.has(`${typeName}Edge`)) {
    schemaComposer.createObjectTC({
      name: `${typeName}Edge`,
      fields: {
        cursor: 'String!',
        node: `${typeName}!`,
      },
    });
  }
  if (!schemaComposer.has(`${typeName}Connection`)) {
    schemaComposer.createObjectTC({
      name: `${typeName}Connection`,
      fields: {
        edges: `[${typeName}Edge!]!`,
        pageInfo: 'PageInfo!',
        nodes: `[${typeName}!]!`,
        totalCount: 'Int!',
      },
    });
  }
}

function mutationWritableColumns(
  naming: SqlNaming,
  table: SqlTableMeta,
  solePk?: SqlColumnMeta,
): { createFields: Record<string, any>; updateFields: Record<string, any> } {
  const createFields: Record<string, any> = {};
  const updateFields: Record<string, any> = {};
  for (const col of table.columns) {
    const isSolePkCol = Boolean(solePk && col.name === solePk.name);
    const fieldName = colFieldName(naming, col, solePk, table);
    const gqlType = mapSqlTypeToGraphQL(col.dataType, { asId: isSolePkCol });
    // Generated columns are DB-assigned — omit from create/update inputs.
    if (col.generated) continue;
    // Create: skip auto-increment sole PK (DB assigns it). Non-generated PK stays writable.
    if (!(isSolePkCol && col.autoIncrement)) {
      createFields[fieldName] = {
        type:
          col.notNull && !col.autoIncrement && !col.hasDefault
            ? new GraphQLNonNull(gqlType)
            : gqlType,
      };
    }
    // Update SET mapping never includes the sole PK (identity is the `where` arg).
    if (!isSolePkCol) {
      updateFields[fieldName] = { type: gqlType };
    }
  }
  return { createFields, updateFields };
}

function createMutationInputs(
  schemaComposer: SchemaComposer,
  naming: SqlNaming,
  typeName: string,
  table: SqlTableMeta,
  solePk?: SqlColumnMeta,
) {
  const { createFields, updateFields } = mutationWritableColumns(naming, table, solePk);
  // Skip empty input types — GraphQL rejects schemas that reference them.
  if (Object.keys(createFields).length) {
    schemaComposer.createInputTC({
      name: naming.createInput(typeName),
      fields: createFields,
    });
  }
  if (Object.keys(updateFields).length) {
    schemaComposer.createInputTC({
      name: naming.updateInput(typeName),
      fields: updateFields,
    });
  }
  const singular = naming.singularField(typeName);
  schemaComposer.createObjectTC({
    name: naming.payloadType(typeName),
    fields: {
      [singular]: typeName,
    },
  });
  schemaComposer.createObjectTC({
    name: naming.deletePayloadType(typeName),
    fields: {
      ok: 'Boolean!',
      affectedRows: 'Int!',
    },
  });
}

function markSqlDirectiveStringsAsBlocks(schema: GraphQLSchema): void {
  const markNode = (astNode: { directives?: readonly any[] } | null | undefined) => {
    const directives = astNode?.directives;
    if (!directives) return;
    for (const directive of directives) {
      if (directive.name.value !== 'sql' || !directive.arguments) continue;
      for (const arg of directive.arguments) {
        if (arg.value.kind !== 'StringValue') continue;
        if (
          arg.name.value !== 'where' &&
          arg.name.value !== 'set' &&
          arg.name.value !== 'selection'
        ) {
          continue;
        }
        // Bare binders like `$args.where` stay as normal `"..."` (same as orderBy).
        // Only real mapping blocks get `"""`.
        if (isBareSqlBinder(arg.value.value)) continue;
        (arg.value as { block?: boolean }).block = true;
      }
    }
  };
  for (const type of Object.values(schema.getTypeMap())) {
    if (!(type instanceof GraphQLObjectType)) continue;
    markNode(type.astNode);
    for (const field of Object.values(type.getFields())) {
      markNode(field.astNode);
    }
  }
}

/** `$args.where` / `$this.id` — single path, not a multi-entry mapping block. */
function isBareSqlBinder(value: string): boolean {
  const trimmed = value.trim();
  // Reject mapping bodies / spreads without a backtracking regex (CodeQL).
  if (
    !trimmed.startsWith('$') ||
    trimmed.includes('\n') ||
    trimmed.includes(':') ||
    trimmed.includes(' ')
  ) {
    return false;
  }
  if (trimmed.includes('...')) return false;
  const segments = trimmed.slice(1).split('.');
  if (!segments.length || segments.some(s => !s)) return false;
  for (const seg of segments) {
    const c0 = seg.charCodeAt(0);
    const okStart = (c0 >= 65 && c0 <= 90) || (c0 >= 97 && c0 <= 122) || c0 === 95; /* A-Z a-z _ */
    if (!okStart) return false;
    for (let i = 1; i < seg.length; i++) {
      const c = seg.charCodeAt(i);
      const ok = (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 48 && c <= 57) || c === 95;
      if (!ok) return false;
    }
  }
  return true;
}

/**
 * Format `@sql` where/set/selection for `"""` block strings.
 * Indent body lines; for single-line values prefix a newline so the printer
 * emits a multiline `"""` block (not `"""value"""`) without a trailing blank.
 */
function blockArg(body: string): string {
  const trimmed = body.replace(/^\n+|\n+$/g, '');
  const indented = trimmed
    .split('\n')
    .map(line => (line.length ? `  ${line}` : line))
    .join('\n');
  return indented.includes('\n') ? indented : `\n${indented}`;
}

/** Raw column (+ optional Postgres `$fn.…` computed) mapping lines. */
function selectionLines(
  naming: SqlNaming,
  table: SqlTableMeta,
  computed: SqlComputedColumnMeta[] = [],
): string {
  const pkCols = table.columns.filter(c => c.primaryKey);
  const solePk = pkCols.length === 1 ? pkCols[0] : undefined;
  const colLines = table.columns.map(col => {
    const fieldName = colFieldName(naming, col, solePk, table);
    return `${fieldName}: ${col.name}`;
  });
  const columnFieldNames = new Set(
    table.columns.map(col => colFieldName(naming, col, solePk, table)),
  );
  // Skip computed fields whose GraphQL name collides with a physical column.
  const fnLines = computed
    .filter(cc => !columnFieldNames.has(cc.fieldName))
    .map(cc => `${cc.fieldName}: $fn.${cc.functionName}`);
  return [...colLines, ...fnLines].join('\n');
}

function selectionBlock(
  naming: SqlNaming,
  table: SqlTableMeta,
  computed: SqlComputedColumnMeta[] = [],
): string {
  return blockArg(selectionLines(naming, table, computed));
}

function insertSetBlock(naming: SqlNaming, table: SqlTableMeta, solePk?: SqlColumnMeta): string {
  const lines: string[] = [];
  for (const col of table.columns) {
    if (col.generated) continue;
    const isSolePkCol = Boolean(solePk && col.name === solePk.name);
    if (isSolePkCol && col.autoIncrement) continue;
    const fieldName = colFieldName(naming, col, solePk, table);
    lines.push(`${col.name}: $args.input.${fieldName}`);
  }
  return blockArg(lines.join('\n'));
}

function updateSetBlock(naming: SqlNaming, table: SqlTableMeta, solePk?: SqlColumnMeta): string {
  const lines: string[] = [];
  for (const col of table.columns) {
    if (col.generated) continue;
    const isSolePkCol = Boolean(solePk && col.name === solePk.name);
    if (isSolePkCol) continue;
    const fieldName = naming.fieldName(col.name);
    lines.push(`${col.name}: $args.input.${fieldName}`);
  }
  return lines.join('\n');
}

function indent(text: string, spaces = 1): string {
  const pad = '  '.repeat(spaces);
  return text
    .split('\n')
    .map(l => (l ? pad + l : l))
    .join('\n');
}
