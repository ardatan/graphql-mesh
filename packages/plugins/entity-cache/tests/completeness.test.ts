import { buildSchema, execute, parse, type ExecutionResult } from 'graphql';
import type { Executor } from '@graphql-tools/utils';
import { describe, expect, it, jest } from '@jest/globals';
import { createEntityCache, type EntityRule } from '../src/index.js';
import { createMemoryEntityStore } from '../src/memory-store.js';

// #9658: valid identities do not prove complete groups when source pagination truncates duplicate rows.
const schema = buildSchema(`
  type Item { sku:String! value:String! }
  type Query { items(keys:[String!]!,limit:Int!=1000):[Item!]! privateValue:String! }
`);
const document = parse(
  'query($keys:[String!]!,$limit:Int!){items(keys:$keys,limit:$limit){sku value}}',
);
const mixed = parse(
  'query($keys:[String!]!,$limit:Int!){items(keys:$keys,limit:$limit){sku value} privateValue}',
);
const req = (keys: string[], limit: number, privateRoot = false) => ({
  document: privateRoot ? mixed : document,
  variables: { keys, limit },
});
const plain = (result: unknown) => JSON.parse(JSON.stringify(result));
function fixture(
  rows: Array<{ sku: string; value: string }>,
  proof?: EntityRule['isComplete'],
  rewriteCap = false,
) {
  const sourceDocuments: string[][] = [];
  let privateValue = 'private-first';
  const executor = jest.fn(async (request: any) => {
    sourceDocuments.push(
      request.document.definitions[0].selectionSet.selections.map((field: any) => field.name.value),
    );
    return execute({
      schema,
      document: request.document,
      variableValues: request.variables,
      rootValue: {
        items({ keys, limit }: { keys: string[]; limit: number }) {
          return rows.filter(row => keys.includes(row.sku)).slice(0, limit);
        },
        privateValue: () => privateValue,
      },
    });
  });
  const rule: EntityRule = {
    source: 'Equipment',
    field: 'items',
    revision: 'complete-v2',
    entityType: 'Item',
    ttlSeconds: 86400,
    ordering: 'key-grouped',
    scope: () => 'public',
    identityField: 'sku',
    identity: row => (row as any)?.sku ?? null,
    selection: () => true,
    batch: args => ({
      keys: args.keys as string[],
      withKeys: keys => ({ ...args, keys, ...(rewriteCap ? { limit: keys.length } : {}) }),
    }),
    isComplete: proof,
  };
  const cache = createEntityCache({ store: createMemoryEntityStore(), rules: [rule] });
  // #9658: this schema-backed fixture has a concrete result shape at the generic executor boundary.
  const wrapped = cache.wrap(executor as Executor, 'Equipment', schema);
  const native = async (request: ReturnType<typeof req>) =>
    execute({
      schema,
      document: request.document,
      variableValues: request.variables,
      rootValue: {
        items({ keys, limit }: { keys: string[]; limit: number }) {
          return rows.filter(row => keys.includes(row.sku)).slice(0, limit);
        },
        privateValue: () => privateValue,
      },
    });
  return {
    cache,
    wrapped,
    executor,
    native,
    sourceDocuments,
    setPrivate: (value: string) => {
      privateValue = value;
    },
  };
}
const belowCap: NonNullable<EntityRule['isComplete']> = (rows, _keys, args) =>
  rows.length < (args.limit as number);

describe('explicit source result completeness', () => {
  it.each([2, 1000])(
    'does not cache omitted identities from a saturated native limit%s batch',
    async limit => {
      const keys = Array.from({ length: limit }, (_, i) => `sku-${i}`);
      const rows = [
        { sku: keys[0], value: 'first-a' },
        { sku: keys[0], value: 'first-b' },
        ...keys.slice(1).map(sku => ({ sku, value: sku })),
      ];
      const f = fixture(rows, belowCap);
      const first = req(keys, limit);
      expect(plain(await f.wrapped(first))).toEqual(plain(await f.native(first)));
      expect(f.cache.metrics.writes).toBe(0);
      const follow = req([keys.at(-1)!], limit);
      expect(plain(await f.wrapped(follow))).toEqual(plain(await f.native(follow)));
      expect(((await f.wrapped(follow)) as ExecutionResult<any>).data!.items).toHaveLength(1);
      expect(f.executor).toHaveBeenCalledTimes(2);
    },
  );
  it('uses the actual rewritten miss cap and refetches the unchanged original request on saturation', async () => {
    const f = fixture(
      [
        { sku: 'a', value: 'a' },
        { sku: 'b', value: 'b1' },
        { sku: 'b', value: 'b2' },
      ],
      belowCap,
      true,
    );
    // Original keys/limit round-trip, but a miss subset rewrites limit2 to limit1.
    // An absent a row makes the first two-key source batch complete below cap and warms only a.
    // Use a direct store-warming first request whose full-key rewrite is unchanged.
    const empty = fixture(
      [
        { sku: 'b', value: 'b1' },
        { sku: 'b', value: 'b2' },
      ],
      belowCap,
      true,
    );
    await empty.wrapped(req(['a', 'missing'], 2));
    const all = req(['a', 'b'], 2);
    expect(plain(await empty.wrapped(all))).toEqual(plain(await empty.native(all)));
    expect(empty.cache.metrics.writes).toBe(2); // only genuine negatives from the complete first batch
    expect(plain(await empty.wrapped(req(['b'], 2)))).toEqual(
      plain(await empty.native(req(['b'], 2))),
    );
    const changed = req(['a', 'b'], 3);
    expect(plain(await f.wrapped(changed))).toEqual(plain(await f.native(changed)));
    expect(f.cache.metrics.writes).toBe(0); // changing the full native cap bypasses planning
  });
  it.each([3, 1000])(
    'does not cache an included positive group truncated at native limit%s',
    async limit => {
      const keys = Array.from({ length: limit - 1 }, (_, i) => `sku-${i}`);
      const last = keys.at(-1)!;
      const rows = [
        ...keys.slice(0, -1).map(sku => ({ sku, value: sku })),
        ...[1, 2, 3].map(n => ({ sku: last, value: `last-${n}` })),
      ];
      const f = fixture(rows, belowCap);
      const first = req(keys, limit);
      expect(plain(await f.wrapped(first))).toEqual(plain(await f.native(first)));
      expect(f.cache.metrics.writes).toBe(0);
      const next = req([last], limit);
      expect(plain(await f.wrapped(next))).toEqual(plain(await f.native(next)));
      expect(((await f.wrapped(next)) as ExecutionResult<any>).data!.items).toHaveLength(3);
      expect(f.cache.metrics.writes).toBe(limit === 3 ? 0 : 1);
    },
  );
  it.each([false, true])(
    'preserves native pagination with %s partial warmth and complete individual groups',
    async partial => {
      const f = fixture(
        [
          { sku: 'a', value: 'a1' },
          { sku: 'a', value: 'a2' },
          { sku: 'b', value: 'b1' },
          { sku: 'b', value: 'b2' },
        ],
        belowCap,
      );
      await f.wrapped(req(['a'], 3));
      if (!partial) await f.wrapped(req(['b'], 3));
      const all = req(['a', 'b'], 3);
      expect(plain(await f.wrapped(all))).toEqual(plain(await f.native(all)));
      expect(((await f.wrapped(req(['b'], 3))) as ExecutionResult<any>).data!.items).toHaveLength(
        2,
      );
      expect(f.cache.metrics.writes).toBe(2);
    },
  );
  it('keeps full mixed native roots when cached groups collectively saturate the original limit', async () => {
    const f = fixture(
      [
        { sku: 'a', value: 'a1' },
        { sku: 'a', value: 'a2' },
        { sku: 'b', value: 'b1' },
        { sku: 'b', value: 'b2' },
      ],
      belowCap,
    );
    await f.wrapped(req(['a'], 3, true));
    await f.wrapped(req(['b'], 3, true));
    f.setPrivate('private-fresh');
    const all = req(['a', 'b'], 3, true);
    expect(plain(await f.wrapped(all))).toEqual(plain(await f.native(all)));
    expect(f.sourceDocuments.at(-1)).toEqual(['items', 'privateValue']);
    expect(f.cache.metrics.writes).toBe(2);
  });
  it('rejects every group from a saturated mixed native batch and fetches an omitted identity fresh', async () => {
    const f = fixture(
      [
        { sku: 'a', value: 'a1' },
        { sku: 'a', value: 'a2' },
        { sku: 'b', value: 'b' },
      ],
      belowCap,
    );
    const all = req(['a', 'b'], 2, true);
    expect(plain(await f.wrapped(all))).toEqual(plain(await f.native(all)));
    expect(f.cache.metrics.writes).toBe(0);
    const next = req(['b'], 2, true);
    expect(plain(await f.wrapped(next))).toEqual(plain(await f.native(next)));
    expect(f.cache.metrics.writes).toBe(1);
  });
  it.each([
    undefined,
    () => false,
    () => 'true' as any,
    () => {
      throw new Error('proof failed');
    },
  ])('bypasses absent, false, nonboolean or throwing proofs', async proof => {
    const f = fixture([{ sku: 'a', value: 'a' }], proof);
    const request = req(['a'], 1000);
    expect(plain(await f.wrapped(request))).toEqual(plain(await f.native(request)));
    await f.wrapped(request);
    expect(f.executor).toHaveBeenCalledTimes(2);
    expect(f.cache.metrics.writes).toBe(0);
  });
  it('continues to cache a complete 25-row native lookup under limit 1000', async () => {
    const rows = Array.from({ length: 25 }, (_, i) => ({ sku: `sku-${i}`, value: `item-${i}` }));
    const f = fixture(rows, belowCap);
    const request = req(
      rows.map(row => row.sku),
      1000,
    );
    expect(plain(await f.wrapped(request))).toEqual(plain(await f.native(request)));
    await f.wrapped(request);
    expect(f.executor).toHaveBeenCalledTimes(1);
    expect(f.cache.metrics.writes).toBe(25);
  });
});
