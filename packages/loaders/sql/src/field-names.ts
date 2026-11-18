import type { SqlColumnMeta } from './introspect/types.js';
import type { SqlNaming } from './naming.js';

/**
 * GraphQL field name for a SQL column.
 * Sole PK → `pkFieldName` (usually `id`) unless that name collides with another
 * column's `fieldName` (then keep the PK's natural camelCase name).
 */
export function graphqlFieldNameForColumn(
  naming: SqlNaming,
  col: SqlColumnMeta,
  solePk: SqlColumnMeta | undefined,
  allColumns: SqlColumnMeta[],
): string {
  const isSolePk = Boolean(solePk && col.name === solePk.name);
  if (!isSolePk) return naming.fieldName(col.name);
  const pkName = naming.pkFieldName(col.name, true);
  const collision = allColumns.some(
    c => c.name !== col.name && naming.fieldName(c.name) === pkName,
  );
  if (collision) return naming.fieldName(col.name);
  return pkName;
}
