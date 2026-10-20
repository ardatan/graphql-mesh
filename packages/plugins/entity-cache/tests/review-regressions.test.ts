import { buildSchema, execute, getOperationAST, parse } from 'graphql';
import type { Executor } from '@graphql-tools/utils';
import { describe, expect, it, jest } from '@jest/globals';
import { createEntityCache, type EntityRule, type EntityStore } from '../src/index.js';
import { createMemoryEntityStore } from '../src/memory-store.js';

// #9658: callback failures preserve actual source execution/results and never expose stale rows.
function fixture() {
  let clock = 0;
  let description = 'original';
  const schema = buildSchema(
    'type Equipment { id:ID! description:String } type Query { equipment(ids:[ID!]!):[Equipment] privateValue:String } type Mutation { updateEquipment:Equipment }',
  );
  const rule: EntityRule = {
    source: 'Assets',
    field: 'equipment',
    entityType: 'Equipment',
    revision: 'review-v1',
    ttlSeconds: 60,
    ordering: 'key-grouped',
    isComplete: () => true,
    scope: () => 'public',
    selection: () => true,
    mutationFields: ['updateEquipment'],
    batch: args => ({ keys: args.ids as string[], withKeys: ids => ({ ids }) }),
    identity: row => (row as any).id,
  };
  const memory = createMemoryEntityStore(() => clock);
  const store: EntityStore = {
    ...memory,
    invalidate: jest.fn(memory.invalidate),
    read: jest.fn(memory.read),
  };
  let originalResult: unknown;
  const executor = jest.fn(async (request: any) => {
    const result = await execute({
      schema,
      document: request.document,
      variableValues: request.variables,
      rootValue: {
        equipment: ({ ids }: any) => ids.map((id: string) => ({ id, description })),
        privateValue: () => 'live-private',
        updateEquipment: () => {
          description = 'committed';
          return { id: 'a', description };
        },
      },
    });
    originalResult = result;
    return result;
  });
  const cache = createEntityCache({ store, rules: [rule], now: () => clock });
  return {
    rule,
    store,
    executor,
    cache,
    wrapped: cache.wrap(executor as Executor, 'Assets', schema),
    original: () => originalResult,
    advance: (ms: number) => {
      clock += ms;
    },
  };
}
const query = { document: parse('{equipment(ids:["a"]){id description}}') };
const mutation = { document: parse('mutation{updateEquipment{id description}}') };
describe('review callback and failed-fence regressions (#9658)', () => {
  it('does not prevent a real write when pre-mutation scope throws', async () => {
    const f = fixture();
    f.rule.scope = () => {
      throw new Error('scope-canary');
    };
    const result: any = await f.wrapped(mutation);
    expect(result.data.updateEquipment.description).toBe('committed');
    expect(f.executor).toHaveBeenCalledTimes(1);
  });
  it('does not obscure a committed write when post-mutation scope throws', async () => {
    const f = fixture();
    let calls = 0;
    f.rule.scope = () => {
      if (++calls >= 2) throw new Error('scope-canary');
      return 'public';
    };
    const result: any = await f.wrapped(mutation);
    expect(result.data.updateEquipment.description).toBe('committed');
    expect(f.executor).toHaveBeenCalledTimes(1);
  });
  it('preserves the real executor error if the cleanup scope callback throws', async () => {
    const f = fixture();
    const error = new Error('real-source-error');
    let calls = 0;
    f.rule.scope = () => {
      if (++calls >= 2) throw new Error('scope-canary');
      return 'public';
    };
    f.executor.mockImplementationOnce(async () => {
      throw error;
    });
    await expect(f.wrapped(mutation)).rejects.toBe(error);
    expect(f.executor).toHaveBeenCalledTimes(1);
  });
  it('bypasses warm stale entries when the store rejects both mutation fences', async () => {
    const f = fixture();
    await f.wrapped(query);
    (f.store.invalidate as any).mockRejectedValue(new Error('store-down'));
    await f.wrapped(mutation);
    const reads = (f.store.read as any).mock.calls.length;
    const result: any = await f.wrapped(query);
    expect(result.data.equipment[0].description).toBe('committed');
    expect((f.store.read as any).mock.calls.length).toBe(reads);
    f.advance(60001);
    await f.wrapped(query);
    expect((f.store.read as any).mock.calls.length).toBeGreaterThan(reads);
  });
  it('bypasses warm stale entries when mutation scope produces rejected invalidation input', async () => {
    const f = fixture();
    await f.wrapped(query);
    f.rule.scope = request =>
      getOperationAST(request.document)?.operation === 'mutation' ? 'x'.repeat(257) : 'public';
    await f.wrapped(mutation);
    const result: any = await f.wrapped(query);
    expect(result.data.equipment[0].description).toBe('committed');
  });
  it('preserves the successful all-miss result when identity extraction throws', async () => {
    const f = fixture();
    f.rule.identity = () => {
      throw new Error('identity-canary');
    };
    const result = await f.wrapped(query);
    expect(result).toBe(f.original());
    expect(f.executor).toHaveBeenCalledTimes(1);
    expect(f.cache.pendingCount()).toBe(0);
    expect(f.cache.metrics.writes).toBe(0);
  });
  it('preserves the complete mixed partial-hit result when identity extraction throws', async () => {
    const f = fixture();
    const mixed = { document: parse('{equipment(ids:["a","b"]){id description} privateValue}') };
    await f.wrapped(query);
    f.rule.identity = () => {
      throw new Error('identity-canary');
    };
    const result: any = await f.wrapped(mixed);
    expect(result).toBe(f.original());
    expect(result.data.privateValue).toBe('live-private');
    expect(result.data.equipment).toHaveLength(2);
  });
});
