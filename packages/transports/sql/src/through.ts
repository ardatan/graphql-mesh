import { parseSqlMapping } from './mapping.js';

/**
 * `@sql(through:)` — PostGraphile-style many-to-many via a junction table.
 *
 * ```
 * table: playlist_track
 * local: PlaylistId
 * remote: TrackId
 * parent: $this.id
 * target: TrackId
 * ```
 */
export interface SqlThroughJoin {
  table: string;
  /** Junction column referencing the parent row */
  localColumn: string;
  /** Junction column referencing the target row */
  remoteColumn: string;
  /** Parent value path after `$this.` (e.g. `['id']`) */
  parentPath: string[];
  /** Column on the target `@sql(table:)` matched to `remoteColumn` */
  targetColumn: string;
}

export function parseSqlThrough(raw?: string | null): SqlThroughJoin | undefined {
  if (raw == null || !String(raw).trim()) return undefined;
  const lines = String(raw)
    .split('\n')
    .map(l => l.replace(/#.*$/, '').trim())
    .filter(Boolean);

  const map = new Map<string, string>();
  for (const line of lines) {
    const idx = line.indexOf(':');
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key && value) map.set(key, value);
  }

  const table = map.get('table');
  const localColumn = map.get('local');
  const remoteColumn = map.get('remote');
  const parentRaw = map.get('parent');
  const targetColumn = map.get('target');
  if (!table || !localColumn || !remoteColumn || !parentRaw || !targetColumn) {
    return undefined;
  }

  const parentMapping = parseSqlMapping(`_: ${parentRaw}`);
  const parentVal = parentMapping.entries[0]?.value;
  if (!parentVal || parentVal.kind !== 'this') return undefined;
  const parentPath = parentVal.path?.length ? parentVal.path : [parentVal.value];

  return {
    table,
    localColumn,
    remoteColumn,
    parentPath,
    targetColumn,
  };
}

export function resolveThroughParentValue(
  through: SqlThroughJoin,
  parent: Record<string, any> | undefined,
): unknown {
  if (!parent) return undefined;
  let cur: any = parent;
  for (const seg of through.parentPath) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[seg];
  }
  return cur;
}
