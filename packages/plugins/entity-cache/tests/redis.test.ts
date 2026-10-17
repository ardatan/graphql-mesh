import { randomUUID } from 'node:crypto';
import Redis from 'ioredis';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { hash } from '../src/plan.js';
import { createRedisEntityStore, ENTITY_FENCE_TTL_SECONDS } from '../src/redis-store.js';

// #9658: Redis integration touches one throwaway namespace, never business keys or FLUSH commands.
(process.env.ENTITY_CACHE_REDIS_TEST === '1' ? describe : describe.skip)(
  'atomic Redis entity storage',
  () => {
    const namespace = `upstream-entity-tests-${randomUUID()}`;
    const partition = hash(['Assets', 'Equipment', 'public']);
    const identity = 'T23';
    const globalKey = `${namespace}:fence:${partition}:global`;
    const entityKey = `${namespace}:fence:${partition}:${hash(identity)}`;
    let client: Redis;
    let other: Redis;
    let store: ReturnType<typeof createRedisEntityStore>;
    beforeAll(async () => {
      if (!process.env.ENTITY_CACHE_REDIS_URL) throw new Error('explicit test Redis URL required');
      const options = { enableOfflineQueue: false, commandTimeout: 1000, lazyConnect: true };
      client = new Redis(process.env.ENTITY_CACHE_REDIS_URL, options);
      other = new Redis(process.env.ENTITY_CACHE_REDIS_URL, options);
      client.on('error', () => {});
      other.on('error', () => {});
      await Promise.all([client.connect(), other.connect()]);
      store = createRedisEntityStore(client, namespace);
    });
    afterAll(async () => {
      if (!client) return;
      let cursor = '0';
      let batches = 0;
      do {
        const [next, keys] = await client.scan(cursor, 'MATCH', `${namespace}:*`, 'COUNT', 100);
        cursor = next;
        if (keys.length) await client.del(...keys);
        if (++batches > 1000) throw new Error('bounded namespace cleanup exceeded');
      } while (cursor !== '0');
      client.disconnect();
      other.disconnect();
    });
    it('shares entries and targeted fences across independent Redis clients', async () => {
      const stamp = (await store.snapshot(partition, [identity]))[0];
      expect(
        await store.write(
          'row',
          { rows: [{ assetTag: identity }], expiresAt: Date.now() + 60000 },
          60,
          partition,
          identity,
          stamp,
        ),
      ).toBe(true);
      const peer = createRedisEntityStore(other, namespace);
      expect((await peer.read(['row']))[0]!.rows).toEqual([{ assetTag: identity }]);
      await peer.invalidate(partition, [identity]);
      expect((await store.snapshot(partition, [identity]))[0]).not.toBe(stamp);
      expect(
        await store.write(
          'row',
          { rows: ['stale'], expiresAt: Date.now() + 60000 },
          60,
          partition,
          identity,
          stamp,
        ),
      ).toBe(false);
    });
    it('keeps unrelated identities valid and invalidates the whole partition for mutations', async () => {
      const before = await store.snapshot(partition, [identity, 'T24']);
      await store.invalidate(partition, [identity]);
      const targeted = await store.snapshot(partition, [identity, 'T24']);
      expect(targeted[0]).not.toBe(before[0]);
      expect(targeted[1]).toBe(before[1]);
      await store.invalidate(partition);
      const all = await store.snapshot(partition, [identity, 'T24']);
      expect(all[0]).not.toBe(targeted[0]);
      expect(all[1]).not.toBe(targeted[1]);
    });
    it('rejects old writes after per-entity fence eviction while old response rows survive', async () => {
      const stamp = (await store.snapshot(partition, [identity]))[0];
      await store.write(
        'old',
        { rows: ['old'], expiresAt: Date.now() + 60000 },
        60,
        partition,
        identity,
        stamp,
      );
      await client.del(entityKey);
      expect((await store.snapshot(partition, [identity]))[0]).not.toBe(stamp);
      expect((await store.read(['old']))[0]!.rows).toEqual(['old']);
      expect(
        await store.write(
          'old',
          { rows: ['late'], expiresAt: Date.now() + 60000 },
          60,
          partition,
          identity,
          stamp,
        ),
      ).toBe(false);
    });
    it('rotates the global incarnation after eviction and rejects writes while a fence is absent', async () => {
      const stamp = (await store.snapshot(partition, [identity]))[0];
      await client.del(globalKey);
      expect(
        await store.write(
          'row',
          { rows: ['late'], expiresAt: Date.now() + 60000 },
          60,
          partition,
          identity,
          stamp,
        ),
      ).toBe(false);
      expect((await store.snapshot(partition, [identity]))[0]).not.toBe(stamp);
    });
    it('refreshes near-expiring fences beyond a full day and rejects oversize UTF-8 rows', async () => {
      const stamp = (await store.snapshot(partition, [identity]))[0];
      await Promise.all([client.expire(globalKey, 1), client.expire(entityKey, 1)]);
      expect(
        await store.write(
          'day',
          { rows: [{ assetTag: identity }], expiresAt: Date.now() + 86400000 },
          86400,
          partition,
          identity,
          stamp,
        ),
      ).toBe(true);
      expect(await client.ttl(globalKey)).toBeGreaterThan(86400);
      expect(await client.ttl(entityKey)).toBeGreaterThan(86400);
      expect(await client.ttl(entityKey)).toBeLessThanOrEqual(ENTITY_FENCE_TTL_SECONDS);
      expect(
        await store.write(
          'oversize',
          { rows: ['日'.repeat(24000)], expiresAt: Date.now() + 60000 },
          60,
          partition,
          identity,
          stamp,
        ),
      ).toBe('rejected');
      expect(await client.exists(`${namespace}:oversize`)).toBe(0);
    });
  },
);
