import pg from 'pg';
import {
  parseSqlUri,
  pgPoolConfigFromLocation,
  resolveSslOption,
} from '@graphql-mesh/transport-sql';
import { createDefaultNaming } from '../naming.js';
import type {
  SqlColumnMeta,
  SqlComputedColumnMeta,
  SqlForeignKeyMeta,
  SqlSchemaMeta,
  SqlTableMeta,
} from './types.js';

/**
 * Options for Postgres schema introspection (used by {@link loadGraphQLSchemaFromSql}).
 *
 * @example
 * ```ts
 * await introspectPostgres({
 *   connectionString: 'postgres://localhost/shop',
 *   schema: 'app',
 *   includeTables: ['albums', 'artists'],
 * })
 * ```
 */
export interface IntrospectPostgresOpts {
  /**
   * Connection URI. Optional when `pool` is provided (pool-only Mesh configs).
   * Still used to derive SSL defaults when opening a new pool.
   *
   * @example 'postgres://localhost:5432/shop'
   */
  connectionString?: string;
  /**
   * Existing `pg.Pool` — reuses its TLS / connection settings for introspection
   * and is not ended by this function.
   *
   * @example myPool
   */
  pool?: pg.Pool;
  /**
   * Only introspect these tables (others omitted from the result).
   *
   * @example ['albums', 'artists']
   */
  includeTables?: string[];
  /**
   * Drop these tables from the result even when otherwise included.
   *
   * @example ['schema_migrations']
   */
  excludeTables?: string[];
  /**
   * Postgres schema / `search_path` used when listing tables, columns, and FKs
   * from `information_schema` (and when discovering `$fn` computed columns).
   *
   * @default 'public'
   * @example 'app'
   */
  schema?: string;
  /**
   * Enable TLS (`true` or mode strings such as `require` / `insecure` /
   * `no-verify`) when opening a new pool. Ignored when `pool` is supplied (that
   * pool's TLS settings are reused).
   *
   * @example true
   */
  tls?: boolean | string;
  /**
   * Extra TLS details (`ca`, `rejectUnauthorized`) when SSL is enabled for a
   * newly opened pool.
   *
   * @example { ca: process.env.DB_CA_PEM }
   */
  ssl?: { rejectUnauthorized?: boolean; ca?: string };
}

export async function introspectPostgres(opts: IntrospectPostgresOpts): Promise<SqlSchemaMeta> {
  const schemaName = opts.schema || 'public';
  const ownsPool = !opts.pool;
  let pool = opts.pool;
  if (!pool) {
    if (!opts.connectionString) {
      throw new Error('Postgres introspection requires connectionString or an existing pg.Pool');
    }
    const parsed = parseSqlUri(opts.connectionString);
    if (parsed.adapter !== 'postgres') {
      throw new Error('Postgres introspection requires a postgres(ql)://… URI');
    }
    const ssl = resolveSslOption(opts.tls, parsed, opts.ssl);
    // Discrete fields — URI sslmode must not override explicit ssl.ca.
    pool = new pg.Pool(pgPoolConfigFromLocation(opts.connectionString, { ssl }));
  }
  try {
    const tableRes = await pool.query<{ name: string }>(
      `SELECT table_name AS name
       FROM information_schema.tables
       WHERE table_schema = $1 AND table_type = 'BASE TABLE'
       ORDER BY table_name`,
      [schemaName],
    );
    let tableNames = tableRes.rows.map(r => String(r.name));
    if (opts.includeTables?.length) {
      const allow = new Set(opts.includeTables);
      tableNames = tableNames.filter(n => allow.has(n));
    }
    if (opts.excludeTables?.length) {
      const deny = new Set(opts.excludeTables);
      tableNames = tableNames.filter(n => !deny.has(n));
    }

    const tables: SqlTableMeta[] = [];
    for (const name of tableNames) {
      const colRes = await pool.query<{
        name: string;
        data_type: string;
        udt_name: string;
        is_nullable: string;
        column_default: string | null;
        is_identity: string;
        is_generated: string;
      }>(
        `SELECT
           column_name AS name,
           data_type,
           udt_name,
           is_nullable,
           column_default,
           is_identity,
           is_generated
         FROM information_schema.columns
         WHERE table_schema = $1 AND table_name = $2
         ORDER BY ordinal_position`,
        [schemaName, name],
      );

      const pkRes = await pool.query<{ column_name: string }>(
        `SELECT kcu.column_name
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
          AND tc.table_name = kcu.table_name
         WHERE tc.table_schema = $1
           AND tc.table_name = $2
           AND tc.constraint_type = 'PRIMARY KEY'
         ORDER BY kcu.ordinal_position`,
        [schemaName, name],
      );
      const pkCols = new Set(pkRes.rows.map(r => String(r.column_name)));

      const columns: SqlColumnMeta[] = colRes.rows.map(c => {
        const dataType = String(c.udt_name || c.data_type || 'text');
        const def = c.column_default != null ? String(c.column_default) : '';
        const isIdentity = String(c.is_identity || '').toUpperCase() === 'YES';
        const generated = String(c.is_generated || '').toUpperCase() === 'ALWAYS';
        return {
          name: String(c.name),
          dataType,
          notNull: String(c.is_nullable).toUpperCase() === 'NO',
          primaryKey: pkCols.has(String(c.name)),
          // Identity via is_identity; sequences via nextval — not nextval inside a quoted literal.
          autoIncrement: isIdentity || isSequenceDefault(def),
          hasDefault: isIdentity || generated || Boolean(def),
          generated,
        };
      });

      // pg_catalog (not information_schema.constraint_column_usage) so non-owner
      // roles still see FK targets they can otherwise reference.
      const fkRes = await pool.query<{
        constraint_name: string;
        column_name: string;
        foreign_table_name: string;
        foreign_column_name: string;
        ordinal_position: number;
      }>(
        `SELECT
           con.conname AS constraint_name,
           att.attname AS column_name,
           rel_f.relname AS foreign_table_name,
           att_f.attname AS foreign_column_name,
           cols.ordinality::int AS ordinal_position
         FROM pg_catalog.pg_constraint con
         JOIN pg_catalog.pg_class rel ON rel.oid = con.conrelid
         JOIN pg_catalog.pg_namespace nsp ON nsp.oid = rel.relnamespace
         JOIN LATERAL unnest(con.conkey) WITH ORDINALITY AS cols(attnum, ordinality)
           ON true
         JOIN pg_catalog.pg_attribute att
           ON att.attrelid = con.conrelid AND att.attnum = cols.attnum
         JOIN pg_catalog.pg_class rel_f ON rel_f.oid = con.confrelid
         JOIN LATERAL unnest(con.confkey) WITH ORDINALITY AS fcols(attnum, ordinality)
           ON fcols.ordinality = cols.ordinality
         JOIN pg_catalog.pg_attribute att_f
           ON att_f.attrelid = con.confrelid AND att_f.attnum = fcols.attnum
         WHERE con.contype = 'f'
           AND nsp.nspname = $1
           AND rel.relname = $2
         ORDER BY con.conname, cols.ordinality`,
        [schemaName, name],
      );

      const fkByName = new Map<string, SqlForeignKeyMeta>();
      for (const fk of fkRes.rows) {
        const constraintName = String(fk.constraint_name);
        let meta = fkByName.get(constraintName);
        if (!meta) {
          meta = {
            columns: [],
            refTable: String(fk.foreign_table_name),
            refColumns: [],
          };
          fkByName.set(constraintName, meta);
        }
        const idx = Number(fk.ordinal_position) - 1;
        meta.columns[idx] = String(fk.column_name);
        meta.refColumns[idx] = String(fk.foreign_column_name);
      }

      tables.push({
        name,
        columns,
        foreignKeys: [...fkByName.values()],
      });
    }

    const computedColumns = await introspectComputedColumns(pool, schemaName, tableNames);
    return { adapter: 'postgres', tables, computedColumns };
  } finally {
    if (ownsPool) {
      await pool.end();
    }
  }
}

/**
 * PostGraphile-compatible computed columns:
 * `CREATE FUNCTION users_full_name(u users) … STABLE` → `User.fullName`.
 */
async function introspectComputedColumns(
  pool: pg.Pool,
  schemaName: string,
  tableNames: string[],
): Promise<SqlComputedColumnMeta[]> {
  if (!tableNames.length) return [];
  const naming = createDefaultNaming();
  const tableSet = new Set(tableNames);
  const res = await pool.query<{
    proname: string;
    nspname: string;
    table_name: string;
    result_type: string;
  }>(
    `SELECT
       p.proname,
       n.nspname,
       t.relname AS table_name,
       pg_catalog.format_type(p.prorettype, NULL) AS result_type
     FROM pg_catalog.pg_proc p
     JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
     JOIN pg_catalog.pg_type arg0 ON arg0.oid = p.proargtypes[0]
     JOIN pg_catalog.pg_class t ON t.reltype = arg0.oid
     JOIN pg_catalog.pg_namespace tn ON tn.oid = t.relnamespace
     WHERE n.nspname = $1
       AND tn.nspname = $1
       AND p.pronargs = 1
       AND NOT p.proretset
       AND p.prorettype <> 'pg_catalog.void'::pg_catalog.regtype
       AND p.provolatile IN ('s', 'i')
       AND p.proname LIKE (t.relname || '\\_%') ESCAPE '\\'`,
    [schemaName],
  );

  const out: SqlComputedColumnMeta[] = [];
  for (const row of res.rows) {
    const table = String(row.table_name);
    if (!tableSet.has(table)) continue;
    const proname = String(row.proname);
    const prefix = `${table}_`;
    if (!proname.startsWith(prefix)) continue;
    const suffix = proname.slice(prefix.length);
    if (!suffix) continue;
    out.push({
      table,
      functionName: `${schemaName}.${proname}`,
      fieldName: naming.fieldName(suffix),
      returnType: String(row.result_type || 'text'),
    });
  }
  return out;
}

/** True when the default expression calls nextval(...), ignoring nextval inside string literals. */
function isSequenceDefault(def: string): boolean {
  if (!def) return false;
  const withoutStrings = def.replace(/'(?:[^']|'')*'/g, "''");
  return /nextval\s*\(/i.test(withoutStrings);
}
