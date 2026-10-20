// #9658: this adapter targets Node 20 and requires cryptographic fence/key identities.
// eslint-disable-next-line import/no-nodejs-modules
import { randomUUID } from 'node:crypto';
import { hash } from './plan.js';
import { cloneEntityValue, ENTITY_FENCE_TTL_SECONDS, serializeEntityEntry } from './policy.js';
import type { EntityEntry, EntityStore } from './types.js';

interface Fence {
  incarnation: string;
  generation: number;
  expiresAt: number;
}

// #9658: bounded reference store. Expired/evicted fences receive random incarnations, like Redis.
export function createMemoryEntityStore(
  now = Date.now,
  { maxEntries = 10_000, fenceTtlSeconds = ENTITY_FENCE_TTL_SECONDS } = {},
): EntityStore {
  // #9658: a negative bound can spin eviction forever; nonfinite bounds defeat admission limits.
  if (!Number.isSafeInteger(maxEntries) || maxEntries <= 0)
    throw new Error('invalid entity maxEntries');
  if (!Number.isFinite(fenceTtlSeconds) || fenceTtlSeconds <= 0)
    throw new Error('invalid entity fence ttl');
  const entries = new Map<string, EntityEntry>();
  const fences = new Map<string, Fence>();
  const cap = <T>(map: Map<string, T>) => {
    while (map.size > maxEntries) map.delete(map.keys().next().value!);
  };
  const fence = (key: string): Fence => {
    let value = fences.get(key);
    if (!value || value.expiresAt <= now())
      value = { incarnation: randomUUID(), generation: 0, expiresAt: 0 };
    value.expiresAt = Math.max(value.expiresAt, now() + fenceTtlSeconds * 1000);
    fences.delete(key);
    fences.set(key, value);
    cap(fences);
    return value;
  };
  const stamp = (partition: string, identity: string) => {
    const global = fence(partition);
    const entity = fence(`${partition}:${hash(identity)}`);
    return `${global.incarnation}.${global.generation}.${entity.incarnation}.${entity.generation}`;
  };
  return {
    async snapshot(partition, identities) {
      return identities.map(id => stamp(partition, id));
    },
    async read(keys) {
      return keys.map(key => {
        const entry = entries.get(key);
        if (entry && entry.expiresAt <= now()) {
          entries.delete(key);
          return null;
        }
        return entry ? cloneEntityValue(entry) : null;
      });
    },
    async write(key, entry, _ttl, partition, identity, expected) {
      if (serializeEntityEntry(entry) === null) return 'rejected';
      if (stamp(partition, identity) !== expected) return false;
      const lifetime = now() + Math.max(fenceTtlSeconds, Math.ceil(_ttl) + 3600) * 1000;
      fence(partition).expiresAt = lifetime;
      fence(`${partition}:${hash(identity)}`).expiresAt = lifetime;
      entries.delete(key);
      entries.set(key, cloneEntityValue(entry));
      cap(entries);
      return true;
    },
    async invalidate(partition, identities) {
      for (const identity of identities ?? [null]) {
        const current = fence(identity === null ? partition : `${partition}:${hash(identity)}`);
        current.generation++;
      }
    },
  };
}
