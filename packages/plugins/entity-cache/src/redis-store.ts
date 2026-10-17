// #9658: this adapter targets Node 20 and requires cryptographic fence/key identities.
// eslint-disable-next-line import/no-nodejs-modules
import { randomUUID } from 'node:crypto';
import type Redis from 'ioredis';
import { hash } from './plan.js';
import {
  ENTITY_FENCE_TTL_SECONDS,
  ENTITY_REPLAY_TTL_SECONDS,
  serializeEntityEntry,
} from './policy.js';
import type { EntityEntry, EntityStore } from './types.js';

// #9658: random incarnations prevent ABA when allkeys-lru evicts a fence while retaining old rows.
// Fence/version/replay history is bounded. Missing history causes safe extra invalidation, never reuse.
export { ENTITY_FENCE_TTL_SECONDS, ENTITY_REPLAY_TTL_SECONDS } from './policy.js';
const SNAPSHOT = `local global = redis.call('GET', KEYS[1])
if not global then global = ARGV[1]; redis.call('SET', KEYS[1], global) end
redis.call('EXPIRE', KEYS[1], ARGV[#ARGV])
local result = {}
for i=2,#KEYS do
  local incarnation = redis.call('HGET', KEYS[i], 'incarnation')
  if not incarnation then incarnation = ARGV[i]; redis.call('HSET', KEYS[i], 'incarnation', incarnation, 'generation', 0) end
  redis.call('EXPIRE', KEYS[i], ARGV[#ARGV])
  result[i-1] = global .. '.' .. incarnation .. '.' .. (redis.call('HGET', KEYS[i], 'generation') or '0')
end
return result`;
const WRITE = `local global = redis.call('GET', KEYS[1])
local incarnation = redis.call('HGET', KEYS[2], 'incarnation')
if not global or not incarnation then return 0 end
local stamp = global .. '.' .. incarnation .. '.' .. (redis.call('HGET', KEYS[2], 'generation') or '0')
if stamp ~= ARGV[1] then return 0 end
redis.call('EXPIRE', KEYS[1], ARGV[4])
redis.call('EXPIRE', KEYS[2], ARGV[4])
redis.call('SET', KEYS[3], ARGV[2], 'PX', ARGV[3])
return 1`;
const INVALIDATE = `for i=2,#KEYS,2 do
  local accepted = true
  if ARGV[1] ~= '' then
    local version = tonumber(redis.call('HGET', KEYS[i], 'version') or '-1')
    if redis.call('EXISTS', KEYS[i+1]) == 1 then accepted = false
    else redis.call('HSET', KEYS[i], 'version', math.max(version, tonumber(ARGV[2]))); redis.call('SET', KEYS[i+1], '1', 'EX', ARGV[3]) end
  end
  if accepted then
    if not redis.call('HGET', KEYS[i], 'incarnation') then redis.call('HSET', KEYS[i], 'incarnation', ARGV[5 + (i-2)/2]) end
    redis.call('HINCRBY', KEYS[i], 'generation', 1)
    redis.call('EXPIRE', KEYS[i], ARGV[4])
  end
end
return 1`;

export function createRedisEntityStore(client: Redis, namespace: string): EntityStore {
  if (!/^[a-zA-Z0-9:_-]{1,128}$/.test(namespace)) throw new Error('invalid entity namespace');
  const prefix = `${namespace}:`;
  const globalKey = (partition: string) => `${prefix}fence:${partition}:global`;
  const entityKey = (partition: string, identity: string) =>
    `${prefix}fence:${partition}:${hash(identity)}`;
  return {
    async snapshot(partition, identities) {
      return (await client.eval(
        SNAPSHOT,
        identities.length + 1,
        globalKey(partition),
        ...identities.map(id => entityKey(partition, id)),
        randomUUID(),
        ...identities.map(() => randomUUID()),
        ENTITY_FENCE_TTL_SECONDS,
      )) as string[];
    },
    async read(keys) {
      if (!keys.length) return [];
      const results = await client.mget(...keys.map(k => prefix + k));
      return results.map(value => {
        if (!value) return null;
        try {
          const entry = JSON.parse(value) as EntityEntry;
          return Array.isArray(entry.rows) && Number.isFinite(entry.expiresAt) ? entry : null;
        } catch {
          return null;
        }
      });
    },
    async write(key, entry, ttl, partition, identity, stamp) {
      const serialized = serializeEntityEntry(entry);
      if (serialized === null) return 'rejected';
      return (
        (await client.eval(
          WRITE,
          3,
          globalKey(partition),
          entityKey(partition, identity),
          prefix + key,
          stamp,
          serialized,
          Math.max(1, Math.floor(ttl * 1000)),
          Math.max(ENTITY_FENCE_TTL_SECONDS, Math.ceil(ttl) + 3600),
        )) === 1
      );
    },
    async invalidate(partition, identities, event) {
      if (!identities) {
        await client.set(globalKey(partition), randomUUID(), 'EX', ENTITY_FENCE_TTL_SECONDS);
        return;
      }
      const keys = identities.flatMap(id => {
        const key = entityKey(partition, id);
        return [key, `${key}:event:${hash(event?.id ?? '')}`];
      });
      await client.eval(
        INVALIDATE,
        keys.length + 1,
        globalKey(partition),
        ...keys,
        event?.id ?? '',
        event?.version ?? '',
        ENTITY_REPLAY_TTL_SECONDS,
        ENTITY_FENCE_TTL_SECONDS,
        ...identities.map(() => randomUUID()),
      );
    },
  };
}
