import type { SqlColumnMeta } from './introspect/types.js';
import type { SqlNaming } from './naming.js';

/**
 * GraphQL field name for a SQL column.
 * Sole PK → `id` unless another column already camelCases to `id` (then keep the PK's natural name).
 */
export function graphqlFieldNameForColumn(
  naming: SqlNaming,
  col: SqlColumnMeta,
  solePk: SqlColumnMeta | undefined,
  allColumns: SqlColumnMeta[],
): string {
  const isSolePk = Boolean(solePk && col.name === solePk.name);
  if (!isSolePk) return naming.fieldName(col.name);
  const idCollision = allColumns.some(
    c => c.name !== col.name && naming.fieldName(c.name) === 'id',
  );
  if (idCollision) return naming.fieldName(col.name);
  return naming.pkFieldName(col.name, true);
}
