import type { EntityEntry } from './types.js';

// #9658: event invalidation permits day-long rows; bounded history outlasts every admitted row.
export const MAX_ENTITY_TTL_SECONDS = 86400;
export const ENTITY_FENCE_TTL_SECONDS = MAX_ENTITY_TTL_SECONDS + 3600;
export const ENTITY_REPLAY_TTL_SECONDS = 3600;
export const MAX_ENTITY_ENTRY_BYTES = 64 * 1024;
export function serializeEntityEntry(entry: EntityEntry): string | null {
  const value = JSON.stringify(entry);
  return Buffer.byteLength(value, 'utf8') <= MAX_ENTITY_ENTRY_BYTES ? value : null;
}

// #9658: execution result transforms must never mutate cache or coalesced caller references.
export function cloneEntityValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
