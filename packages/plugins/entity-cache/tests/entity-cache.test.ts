import { buildSchema, execute, GraphQLError, parse, print, type GraphQLScalarType } from 'graphql';
import { visitResult, type Executor } from '@graphql-tools/utils';
import { describe, expect, it, jest } from '@jest/globals';
import { createEntityCache, type EntityRule, type EntityStore } from '../src';
import { createMemoryEntityStore } from '../src/memory-store';
import { strapiProductEntityRule } from './catalog-fixture.js';

const waitFor = async (check: () => void) => {
  for (let i = 0; i < 100; i++) {
    try {
      check();
      return;
    } catch (error) {
      if (i === 99) throw error;
      await new Promise(resolve => setTimeout(resolve, 1));
    }
  }
};

// #9658: exercise real executor documents, default coercion, partial errors and invalidation races.
const schema = buildSchema(`
  input SkuFilter { in: [String!]! }
  input ProductFilter { sku: SkuFilter! }
  input Pagination { limit: Int! }
  type Image { name: String url: String formats: String }
  type Product { sku: String! name: String brand: String ownerVendor: String images(pagination: Pagination): [Image] }
  type Query { products(filters: ProductFilter!, pagination: Pagination!): [Product] }
  type Mutation { updateProduct: Product }
`);
const document = parse(
  'query Batch($filters: ProductFilter!, $pagination: Pagination!, $show: Boolean = true) { products(filters: $filters, pagination: $pagination) { sku name @include(if: $show) } }',
);
const request = (keys: string[], variables: Record<string, unknown> = {}) => ({
  document,
  variables: { filters: { sku: { in: keys } }, pagination: { limit: 1000 }, ...variables },
});
const invalidate = { source: 'Strapi', entityType: 'Product', scope: 'public-catalog' };

function fixture(
  options: {
    store?: EntityStore;
    rule?: EntityRule;
    now?: () => number;
    timeoutMs?: number;
    maxPending?: number;
  } = {},
) {
  const db = new Map<string, any[]>([
    ['a', [{ sku: 'a', name: 'Apple' }]],
    ['b', [{ sku: 'b', name: 'Bread' }]],
    ['c', [{ sku: 'c', name: 'Carrot' }]],
  ]);
  const calls: string[][] = [];
  const executor = jest.fn(async (req: any) =>
    execute({
      schema,
      document: req.document,
      variableValues: req.variables,
      rootValue: {
        products({ filters }: any) {
          calls.push(filters.sku.in);
          return filters.sku.in.flatMap((k: string) => db.get(k) ?? []).reverse();
        },
        updateProduct() {
          return { sku: 'a', name: 'New' };
        },
      },
    }),
  );
  const store = options.store ?? createMemoryEntityStore(options.now);
  const cache = createEntityCache({
    store,
    rules: [options.rule ?? strapiProductEntityRule],
    now: options.now,
    timeoutMs: options.timeoutMs,
    maxPending: options.maxPending,
  });
  const wrapped = cache.wrap(executor as Executor, 'Strapi', schema);
  return { db, calls, executor, store, cache, wrapped };
}
const data = (value: any) => JSON.parse(JSON.stringify(value.data));
const last = <T>(array: T[]): T => array[array.length - 1];

describe('generic delegated entity cache', () => {
  it('isolates nested GraphQL Tools result transforms from stored rows', async () => {
    const f = fixture();
    f.db.set('a', [{ sku: 'a', name: 'Apple', images: [{ name: 'original', url: '/image' }] }]);
    const req = {
      ...request(['a']),
      document: parse(
        'query Batch($filters: ProductFilter!, $pagination: Pagination!) { products(filters: $filters, pagination: $pagination) { sku images { name url } } }',
      ),
    };
    const first: any = await f.wrapped(req);
    visitResult(first, req, schema, { Image: { name: value => `transformed:${value}` } });
    expect(first.data.products[0].images[0].name).toBe('transformed:original');
    const second: any = await f.wrapped(req);
    expect(second.data.products[0].images[0].name).toBe('original');
    expect(f.executor).toHaveBeenCalledTimes(1);
  });

  it('isolates concurrent coalesced results from each other and the next cache hit', async () => {
    const f = fixture();
    const original = f.executor.getMockImplementation()!;
    let release!: () => void;
    const gate = new Promise<void>(resolve => {
      release = resolve;
    });
    f.executor.mockImplementationOnce(async req => {
      await gate;
      return original(req);
    });
    const first = f.wrapped(request(['a']));
    await waitFor(() => expect(f.executor).toHaveBeenCalledTimes(1));
    const second = f.wrapped(request(['a']));
    await waitFor(() => expect(f.cache.metrics.coalesced).toBe(1));
    release();
    const [a, b]: any[] = await Promise.all([first, second]);
    a.data.products[0].name = 'transformed';
    expect(b.data.products[0].name).toBe('Apple');
    expect(data(await f.wrapped(request(['a']))).products[0].name).toBe('Apple');
    expect(f.executor).toHaveBeenCalledTimes(1);
  });

  it('rejects unsafe constructor limits before any executor or eviction work', () => {
    for (const maxEntries of [-1, 0, NaN, Infinity, 1.5])
      expect(() => createMemoryEntityStore(Date.now, { maxEntries })).toThrow('maxEntries');
    for (const fenceTtlSeconds of [-1, 0, NaN, Infinity])
      expect(() => createMemoryEntityStore(Date.now, { fenceTtlSeconds })).toThrow('fence ttl');
    for (const maxPending of [-1, NaN, Infinity, 1.5])
      expect(() => fixture({ maxPending })).toThrow('maxPending');
    for (const timeoutMs of [-1, 0, NaN, Infinity, 2_147_483_648])
      expect(() => fixture({ timeoutMs })).toThrow('timeout');
    for (const maxBatchSize of [-1, 0, NaN, Infinity, 1.5])
      expect(() => fixture({ rule: { ...strapiProductEntityRule, maxBatchSize } })).toThrow(
        'maxBatchSize',
      );
    expect(() => fixture({ maxPending: 0 })).not.toThrow();
  });

  it('bypasses duplicate lookup keys on cold and warm requests without changing payload multiplicity', async () => {
    const f = fixture();
    const cold = await f.wrapped(request(['a', 'a']));
    expect(data(cold).products).toEqual([
      { sku: 'a', name: 'Apple' },
      { sku: 'a', name: 'Apple' },
    ]);
    await f.wrapped(request(['a']));
    f.db.set('a', [{ sku: 'a', name: 'Fresh' }]);
    const warm = await f.wrapped(request(['a', 'a']));
    expect(data(warm).products).toEqual([
      { sku: 'a', name: 'Fresh' },
      { sku: 'a', name: 'Fresh' },
    ]);
    expect(f.calls).toEqual([['a', 'a'], ['a'], ['a', 'a']]);
  });

  it('reuses canonical rows across two gateway instances and vendor contexts', async () => {
    const store = createMemoryEntityStore();
    const a = fixture({ store });
    const b = fixture({ store });
    const cold = await a.wrapped({ ...request(['b', 'a']), context: { vendor: 'first' } });
    const warm = await b.wrapped({ ...request(['b', 'a']), context: { vendor: 'second' } });
    expect(data(warm)).toEqual(data(cold));
    expect(a.calls).toEqual([['b', 'a']]);
    expect(b.calls).toEqual([]);
  });
  it('fetches only misses and groups duplicate rows in requested-key order with gaps', async () => {
    const f = fixture();
    f.db.set('a', [
      { sku: 'a', name: 'First' },
      { sku: 'a', name: 'Second' },
    ]);
    await f.wrapped(request(['a']));
    const result = await f.wrapped(request(['b', 'a', 'absent']));
    expect(data(result).products.map((r: any) => r.sku)).toEqual(['b', 'a', 'a']);
    expect(f.calls).toEqual([['a'], ['b', 'absent']]);
    await f.wrapped(request(['absent']));
    expect(f.calls).toHaveLength(2);
  });
  it('separates directive variables and resolves variable defaults', async () => {
    const f = fixture();
    expect(data(await f.wrapped(request(['a'], { show: false }))).products[0]).toEqual({
      sku: 'a',
    });
    expect(data(await f.wrapped(request(['a']))).products[0].name).toBe('Apple');
    await f.wrapped(request(['a'], { show: true }));
    expect(f.calls).toHaveLength(2);
  });
  it('separates nested argument values and selections', async () => {
    const f = fixture();
    f.db.set('a', [
      {
        sku: 'a',
        name: 'Apple',
        images: ({ pagination }: any) => [{ name: String(pagination.limit) }],
      },
    ]);
    const doc = parse(
      'query($filters: ProductFilter!, $pagination: Pagination!, $n: Int!) { products(filters:$filters,pagination:$pagination) { sku images(pagination:{limit:$n}) { name } } }',
    );
    const q = (n: number) => ({ ...request(['a'], { n }), document: doc });
    expect(data(await f.wrapped(q(1))).products[0].images[0].name).toBe('1');
    expect(data(await f.wrapped(q(2))).products[0].images[0].name).toBe('2');
    expect(f.calls).toHaveLength(2);
  });
  it('isolates explicit tenant scopes', async () => {
    const f = fixture({
      rule: { ...strapiProductEntityRule, scope: req => (req.context as any)?.tenant ?? null },
    });
    await f.wrapped({ ...request(['a']), context: { tenant: 'one' } });
    f.db.set('a', [{ sku: 'a', name: 'Other tenant' }]);
    expect(
      data(await f.wrapped({ ...request(['a']), context: { tenant: 'two' } })).products[0].name,
    ).toBe('Other tenant');
    expect(
      data(await f.wrapped({ ...request(['a']), context: { tenant: 'one' } })).products[0].name,
    ).toBe('Apple');
  });
  it('bypasses owner/vendor data, root directives, fragments and invalid variables', async () => {
    const f = fixture();
    const q = (source: string) => ({ ...request(['a']), document: parse(source) });
    const head = 'query($filters:ProductFilter!,$pagination:Pagination!)';
    await f.wrapped(
      q(`${head}{products(filters:$filters,pagination:$pagination){sku ownerVendor}}`),
    );
    await f.wrapped(
      q(`${head}{products(filters:$filters,pagination:$pagination) @skip(if:true){sku}}`),
    );
    await f.wrapped(
      q(
        `${head}{products(filters:$filters,pagination:$pagination){...P}} fragment P on Product{sku}`,
      ),
    );
    await f.wrapped(request(['a'], { show: 'invalid' }));
    expect(f.cache.metrics.writes).toBe(0);
    expect(f.executor).toHaveBeenCalledTimes(4);
  });
  it('rewrites literal and variable inputs without leaving unused variables', async () => {
    const f = fixture();
    await f.wrapped(request(['a']));
    const literal = {
      document: parse(
        '{ products(filters:{sku:{in:["a","b"]}},pagination:{limit:1000}) { sku name @include(if:true) } }',
      ),
    };
    await f.wrapped(literal);
    expect(last(f.calls)).toEqual(['a', 'b']);
    await f.wrapped(request(['a', 'c']));
    expect(last(f.calls)).toEqual(['c']);
    const finalRequest = last(f.executor.mock.calls)[0];
    expect(print(finalRequest.document)).not.toContain('$filters');
  });
  // #9658: fallback expiry remains fixed at one day even after near-expiry hits.
  it('expires a day-long row at the deadline without sliding retention on a hit', async () => {
    let clock = 0;
    const f = fixture({ now: () => clock });
    await f.wrapped(request(['a']));
    f.db.set('a', [{ sku: 'a', name: 'Corrected' }]);
    clock = 86400000 - 1;
    expect(data(await f.wrapped(request(['a']))).products[0].name).toBe('Apple');
    clock++;
    expect(data(await f.wrapped(request(['a']))).products[0].name).toBe('Corrected');
    expect(f.calls).toHaveLength(2);
  });
  it('uses short bounded negative TTL and expires positive rows', async () => {
    let clock = 10_000;
    const f = fixture({ now: () => clock, rule: { ...strapiProductEntityRule, ttlSeconds: 60 } });
    await f.wrapped(request(['absent', 'a']));
    f.db.set('absent', [{ sku: 'absent', name: 'Appeared' }]);
    clock += 9_000;
    await f.wrapped(request(['absent', 'a']));
    expect(f.calls).toHaveLength(1);
    clock += 2_000;
    await f.wrapped(request(['absent', 'a']));
    expect(last(f.calls)).toEqual(['absent']);
    clock += 60_000;
    await f.wrapped(request(['a']));
    expect(last(f.calls)).toEqual(['a']);
  });
  it('coalesces overlapping misses by key while unrelated identities run', async () => {
    const f = fixture();
    const original = f.executor.getMockImplementation()!;
    let release!: () => void;
    const gate = new Promise<void>(r => {
      release = r;
    });
    f.executor.mockImplementationOnce(async req => {
      await gate;
      return original(req);
    });
    const first = f.wrapped(request(['a', 'b']));
    await waitFor(() => expect(f.executor).toHaveBeenCalledTimes(1));
    const second = f.wrapped(request(['b', 'c']));
    await waitFor(() => expect(f.executor).toHaveBeenCalledTimes(2));
    release();
    const results = await Promise.all([first, second]);
    expect(data(results[1]).products.map((r: any) => r.sku)).toEqual(['b', 'c']);
    expect(f.calls).toEqual([['c'], ['a', 'b']]);
    expect(f.cache.metrics.coalesced).toBe(1);
    expect(f.cache.pendingCount()).toBe(0);
  });
  it('falls back to the full request after a mixed hit partial error preserving paths', async () => {
    const f = fixture();
    await f.wrapped(request(['a']));
    const result = {
      data: { products: [{ sku: 'b', name: null }] },
      errors: [new GraphQLError('name unavailable', { path: ['products', 0, 'name'] })],
    };
    f.executor.mockResolvedValueOnce(result);
    const answer = await f.wrapped(request(['a', 'b']));
    expect(data(answer).products.map((r: any) => r.sku)).toEqual(['b', 'a']);
    expect(last(f.calls)).toEqual(['a', 'b']);
    expect(f.cache.metrics.writes).toBe(1);
  });
  it('passes through all-miss errors once and releases waiting requests', async () => {
    const f = fixture();
    const result = { data: { products: null }, errors: [new GraphQLError('error')] };
    f.executor.mockResolvedValueOnce(result);
    expect(await f.wrapped(request(['a']))).toBe(result);
    expect(f.executor).toHaveBeenCalledTimes(1);
    expect(f.cache.pendingCount()).toBe(0);
  });
  it('does not cache missing identities, extensions or incremental streams', async () => {
    const f = fixture();
    f.executor.mockResolvedValueOnce({ data: { products: [{ name: 'no identity' }] } });
    await f.wrapped(request(['a']));
    f.executor.mockResolvedValueOnce({
      data: { products: [{ sku: 'a' }] },
      extensions: { trace: 'per-request' },
    });
    await f.wrapped(request(['a']));
    const stream = (async function* () {
      yield { data: { products: [] } };
    })();
    f.executor.mockResolvedValueOnce(stream as any);
    expect(await f.wrapped(request(['a']))).toBe(stream);
    expect(f.cache.metrics.writes).toBe(0);
  });
  it.each([false, true])(
    'closes a discarded transformed stream before retrying (injected key: %s)',
    async injected => {
      const f = fixture({
        rule: { ...strapiProductEntityRule, identityField: injected ? 'sku' : undefined },
      });
      const q = injected
        ? {
            ...request(['a']),
            document: parse(
              'query($filters:ProductFilter!,$pagination:Pagination!){products(filters:$filters,pagination:$pagination){name}}',
            ),
          }
        : request(['a', 'b']);
      if (!injected) await f.wrapped(request(['a']));
      const returned = jest.fn(async () => ({ done: true, value: undefined }));
      const iterator = {
        next: async () => ({ done: false, value: { data: {} } }),
        return: returned,
      };
      const stream = { [Symbol.asyncIterator]: () => iterator };
      f.executor.mockResolvedValueOnce(stream as any);
      const result = await f.wrapped(q);
      expect(returned).toHaveBeenCalledTimes(1);
      expect(data(result).products).toHaveLength(injected ? 1 : 2);
      if (injected) expect(data(result).products[0]).toEqual({ name: 'Apple' });
    },
  );
  it('fails open on reads, writes and timeouts without changing upstream errors', async () => {
    const store = createMemoryEntityStore();
    const f = fixture({
      store: {
        ...store,
        read: async () => {
          throw new Error('redis down');
        },
      },
    });
    expect(data(await f.wrapped(request(['a']))).products[0].name).toBe('Apple');
    const g = fixture({
      store: {
        ...store,
        write: async () => {
          throw new Error('redis down');
        },
      },
    });
    expect(data(await g.wrapped(request(['a']))).products[0].name).toBe('Apple');
    const h = fixture({ timeoutMs: 5, store: { ...store, snapshot: () => new Promise(() => {}) } });
    expect(data(await h.wrapped(request(['a']))).products[0].name).toBe('Apple');
  });
  it('fences an in-flight read, then rereads after a concurrent external invalidation', async () => {
    const f = fixture();
    let release!: () => void;
    const gate = new Promise<void>(r => {
      release = r;
    });
    f.executor.mockImplementationOnce(async () => {
      await gate;
      return { data: { products: [{ sku: 'a', name: 'Stale' }] } };
    });
    const pending = f.wrapped(request(['a']));
    await waitFor(() => expect(f.executor).toHaveBeenCalledTimes(1));
    await f.cache.invalidate({ ...invalidate, identities: ['a'] });
    f.db.set('a', [{ sku: 'a', name: 'Fresh' }]);
    release();
    expect(data(await pending).products[0].name).toBe('Fresh');
    expect(f.cache.metrics.fencedWrites).toBe(1);
    expect(data(await f.wrapped(request(['a']))).products[0].name).toBe('Fresh');
  });
  it('fences an eager mutation stream commit before any caller iteration', async () => {
    const f = fixture();
    await f.wrapped(request(['a']));
    let release!: () => void;
    const gate = new Promise<void>(resolve => {
      release = resolve;
    });
    f.executor.mockImplementationOnce(async req => {
      await gate;
      const committed = await execute({
        schema,
        document: req.document,
        rootValue: {
          updateProduct() {
            f.db.set('a', [{ sku: 'a', name: 'Committed' }]);
            return { sku: 'a' };
          },
        },
      });
      return {
        [Symbol.asyncIterator]() {
          return this;
        },
        async next() {
          return { done: true, value: committed };
        },
        async return() {
          return { done: true, value: undefined };
        },
      } as any;
    });
    const pending = f.wrapped({ document: parse('mutation { updateProduct { sku } }') });
    await waitFor(() => expect(f.executor).toHaveBeenCalledTimes(2));
    expect(data(await f.wrapped(request(['a']))).products[0].name).toBe('Apple');
    release();
    const stream: any = await pending;
    // The native commit already happened, even though next/return/throw has not run.
    expect(data(await f.wrapped(request(['a']))).products[0].name).toBe('Committed');
    await stream.return();
  });

  it('forwards cancellation of a mutation stream before its first next call', async () => {
    const f = fixture();
    let closed = false;
    f.executor.mockImplementationOnce(
      async () =>
        ({
          [Symbol.asyncIterator]() {
            return this;
          },
          async next() {
            return { done: true, value: undefined };
          },
          async return() {
            closed = true;
            return { done: true, value: undefined };
          },
        }) as any,
    );
    const stream: any = await f.wrapped({ document: parse('mutation { updateProduct { sku } }') });
    await stream.return();
    expect(closed).toBe(true);
    // #9658: executor completion and iterator acquisition each fence before per-operation fences.
    expect(f.cache.metrics.invalidations).toBe(4);
  });

  it('fences lazy mutation commits after each payload and preserves cancellation', async () => {
    const f = fixture();
    await f.wrapped(request(['a']));
    let closed = false;
    f.executor.mockImplementationOnce(
      async req =>
        (async function* () {
          try {
            yield await execute({
              schema,
              document: req.document,
              rootValue: {
                updateProduct() {
                  f.db.set('a', [{ sku: 'a', name: 'Committed' }]);
                  return { sku: 'a' };
                },
              },
            });
            await new Promise<void>(() => {});
          } finally {
            closed = true;
          }
        })() as any,
    );
    const stream: any = await f.wrapped({ document: parse('mutation { updateProduct { sku } }') });
    expect(data(await f.wrapped(request(['a']))).products[0].name).toBe('Apple');
    await stream.next();
    expect(data(await f.wrapped(request(['a']))).products[0].name).toBe('Committed');
    await stream.return();
    expect(closed).toBe(true);
    // #9658: executor completion and iterator acquisition each fence before per-operation fences.
    expect(f.cache.metrics.invalidations).toBe(5);
  });

  it('fences a lazy mutation iterator that commits and then fails', async () => {
    const f = fixture();
    await f.wrapped(request(['a']));
    f.executor.mockImplementationOnce(
      async () =>
        (async function* () {
          f.db.set('a', [{ sku: 'a', name: 'Committed' }]);
          throw new Error('stream failed');
          yield {};
        })() as any,
    );
    const stream: any = await f.wrapped({ document: parse('mutation { updateProduct { sku } }') });
    await f.wrapped(request(['a']));
    await expect(stream.next()).rejects.toThrow('stream failed');
    expect(data(await f.wrapped(request(['a']))).products[0].name).toBe('Committed');
    // #9658: executor completion and iterator acquisition each fence before per-operation fences.
    expect(f.cache.metrics.invalidations).toBe(4);
  });

  it('fences product GraphQL writes before and after in shared storage', async () => {
    const store = createMemoryEntityStore();
    const f = fixture({ store });
    const g = fixture({ store });
    await f.wrapped(request(['a']));
    await g.wrapped({ document: parse('mutation { updateProduct { sku } }') });
    f.db.set('a', [{ sku: 'a', name: 'Fresh' }]);
    expect(data(await f.wrapped(request(['a']))).products[0].name).toBe('Fresh');
    expect(g.cache.metrics.invalidations).toBe(2);
  });
  it('fences a product mutation whose root field appears inside a fragment', async () => {
    const f = fixture();
    await f.wrapped(request(['a']));
    await f.wrapped({
      document: parse(
        'mutation { ...Write } fragment Write on Mutation { changed: updateProduct { sku } }',
      ),
    });
    f.db.set('a', [{ sku: 'a', name: 'Changed' }]);
    expect(data(await f.wrapped(request(['a']))).products[0].name).toBe('Changed');
    expect(f.cache.metrics.invalidations).toBe(2);
  });
  it('strips an internally requested key on success and retries the original projection on partial errors', async () => {
    const f = fixture({ rule: { ...strapiProductEntityRule, identityField: 'sku' } });
    const query = {
      ...request(['a']),
      document: parse(
        'query($filters:ProductFilter!,$pagination:Pagination!){products(filters:$filters,pagination:$pagination){name}}',
      ),
    };
    expect(data(await f.wrapped(query)).products).toEqual([{ name: 'Apple' }]);
    expect(data(await f.wrapped(query)).products).toEqual([{ name: 'Apple' }]);
    expect(f.calls).toHaveLength(1);
    await f.cache.invalidate({ ...invalidate, identities: ['a'] });
    f.executor.mockResolvedValueOnce({
      data: { products: [{ sku: 'a', name: null }] },
      errors: [new GraphQLError('key permission', { path: ['products', 0, 'sku'] })],
    });
    const answer = await f.wrapped(query);
    expect(data(answer).products).toEqual([{ name: 'Apple' }]);
    expect(print(last(f.executor.mock.calls)[0].document)).not.toMatch(/\bsku\s*\}/);
  });
  it('does not remove another owner promise after unregistered overflow work finishes', async () => {
    const f = fixture({ maxPending: 1 });
    const original = f.executor.getMockImplementation()!;
    const releases: Array<() => void> = [];
    for (let i = 0; i < 3; i++)
      f.executor.mockImplementationOnce(async req => {
        await new Promise<void>(resolve => {
          releases.push(resolve);
        });
        return original(req);
      });
    const a = f.wrapped(request(['a']));
    await waitFor(() => expect(releases).toHaveLength(1));
    const overflow = f.wrapped(request(['b']));
    await waitFor(() => expect(releases).toHaveLength(2));
    releases[0]();
    await a;
    const b = f.wrapped(request(['b']));
    await waitFor(() => expect(releases).toHaveLength(3));
    releases[1]();
    await overflow;
    expect(f.cache.pendingCount()).toBe(1);
    releases[2]();
    await b;
    expect(f.cache.pendingCount()).toBe(0);
  });
  it('treats expired or evicted memory fences as new incarnations', async () => {
    let clock = 100;
    const store = createMemoryEntityStore(() => clock, { maxEntries: 3, fenceTtlSeconds: 1 });
    const stamp = (await store.snapshot('partition', ['a']))[0];
    await store.write(
      'row',
      { rows: ['old'], expiresAt: clock + 10_000 },
      10,
      'partition',
      'a',
      stamp,
    );
    // Admitted rows extend fences past their lifetime; expiry remains safe after that retention.
    clock += 3_611_000;
    expect((await store.snapshot('partition', ['a']))[0]).not.toBe(stamp);
    expect(
      await store.write(
        'row',
        { rows: ['late'], expiresAt: clock + 10_000 },
        10,
        'partition',
        'a',
        stamp,
      ),
    ).toBe(false);
    const fresh = (await store.snapshot('partition', ['a']))[0];
    await store.snapshot('partition', ['b', 'c', 'd']);
    expect((await store.snapshot('partition', ['a']))[0]).not.toBe(fresh);
  });
  it('supports another source, key shape, tenant scope and argument defaults', async () => {
    const other = buildSchema(
      'type Person { employeeNumber: ID! label(locale:String="en"): String } type Query { staff(numbers:[ID!]!, region:String="west"): [Person] }',
    );
    const rule: EntityRule = {
      source: 'Directory',
      field: 'staff',
      revision: '1',
      entityType: 'Person',
      ttlSeconds: 30,
      ordering: 'key-grouped',
      isComplete: () => true, // #9658: these fixture resolvers exhaust every requested identity group.
      scope: req => (req.context as any)?.tenant ?? null,
      selection: () => true,
      identity: row => (row as any)?.employeeNumber ?? null,
      batch: args => ({
        keys: args.numbers as string[],
        withKeys: keys => ({ ...args, numbers: keys }),
      }),
    };
    const cache = createEntityCache({ store: createMemoryEntityStore(), rules: [rule] });
    const executor = jest.fn(async (req: any) =>
      execute({
        schema: other,
        document: req.document,
        variableValues: req.variables,
        rootValue: {
          staff: ({ numbers, region }: any) =>
            numbers.map((employeeNumber: string) => ({ employeeNumber, label: region })),
        },
      }),
    );
    const wrap = cache.wrap(executor as Executor, 'Directory', other);
    const q = {
      document: parse('{ staff(numbers:["23"]) { employeeNumber label } }'),
      context: { tenant: 'company' },
    };
    expect(data(await wrap(q)).staff[0].label).toBe('west');
    expect(data(await wrap(q)).staff[0].label).toBe('west');
    expect(executor).toHaveBeenCalledTimes(1);
    await wrap({
      ...q,
      document: parse('{ staff(numbers:["23"],region:"east") { employeeNumber label } }'),
    });
    expect(executor).toHaveBeenCalledTimes(2);
  });
  it('bypasses custom scalar values whose coerced representation is not plain JSON', async () => {
    const dated = buildSchema(
      'scalar Instant type Person { id: ID! label: String } type Query { people(ids:[ID!]!,asOf:Instant!): [Person] }',
    );
    (dated.getType('Instant') as GraphQLScalarType).parseValue = value => new Date(String(value));
    const rule: EntityRule = {
      source: 'Directory',
      field: 'people',
      entityType: 'Person',
      revision: 'dated',
      ttlSeconds: 30,
      ordering: 'key-grouped',
      isComplete: () => true, // #9658: these fixture resolvers exhaust every requested identity group.
      scope: () => 'public',
      selection: () => true,
      identity: row => (row as any)?.id ?? null,
      batch: args => ({ keys: args.ids as string[], withKeys: keys => ({ ...args, ids: keys }) }),
    };
    const cache = createEntityCache({ store: createMemoryEntityStore(), rules: [rule] });
    const executor = jest.fn(async (req: any) =>
      execute({
        schema: dated,
        document: req.document,
        variableValues: req.variables,
        rootValue: {
          people: ({ ids, asOf }: any) =>
            ids.map((id: string) => ({ id, label: asOf.toISOString() })),
        },
      }),
    );
    const wrap = cache.wrap(executor as Executor, 'Directory', dated);
    const document = parse('query($asOf:Instant!){people(ids:["a"],asOf:$asOf){id label}}');
    const a = await wrap({ document, variables: { asOf: '2026-01-01' } });
    const b = await wrap({ document, variables: { asOf: '2026-02-01' } });
    expect(data(a).people[0].label).toBe('2026-01-01T00:00:00.000Z');
    expect(data(b).people[0].label).toBe('2026-02-01T00:00:00.000Z');
    expect(executor).toHaveBeenCalledTimes(2);
    expect(cache.metrics.writes).toBe(0);
  });
  it.each(['root', 'selection'])(
    'preserves non-roundtripping plain-string custom scalar inputs (%s)',
    async position => {
      const token = buildSchema(
        'scalar Token type Person { id: ID! label(style:Token): String } type Query { people(ids:[ID!]!,style:Token): [Person] }',
      );
      const scalar = token.getType('Token') as GraphQLScalarType;
      scalar.parseValue = value => `variable:${value}`;
      scalar.serialize = value => `output:${value}`;
      scalar.parseLiteral = node => `literal:${(node as any).value}`;
      const rule: EntityRule = {
        source: 'Directory',
        field: 'people',
        entityType: 'Person',
        revision: 'token',
        ttlSeconds: 30,
        ordering: 'key-grouped',
        isComplete: () => true, // #9658: these fixture resolvers exhaust every requested identity group.
        scope: () => 'public',
        selection: () => true,
        identity: row => (row as any)?.id ?? null,
        batch: args => ({ keys: args.ids as string[], withKeys: keys => ({ ...args, ids: keys }) }),
      };
      const cache = createEntityCache({ store: createMemoryEntityStore(), rules: [rule] });
      const executor = jest.fn(async (req: any) =>
        execute({
          schema: token,
          document: req.document,
          variableValues: req.variables,
          rootValue: {
            people: ({ ids, style }: any) =>
              ids.map((id: string) => ({ id, label: (args: any) => args.style ?? style })),
          },
        }),
      );
      const wrap = cache.wrap(executor as Executor, 'Directory', token);
      const document = parse(
        position === 'root'
          ? 'query($style:Token){people(ids:["a"],style:$style){id label}}'
          : 'query($style:Token){people(ids:["a"]){id label(style:$style)}}',
      );
      const q = { document, variables: { style: 'x' } };
      const original = await executor(q);
      const wrapped = await wrap(q);
      const repeat = await wrap(q);
      expect(data(wrapped)).toEqual(data(original));
      expect(data(repeat)).toEqual(data(original));
      expect(data(wrapped).people[0].label).toBe('variable:x');
      expect(cache.metrics.writes).toBe(0);
    },
  );
  it('keeps raw enum selection variables and permits input defaults beside unused custom scalar fields', async () => {
    const enumSchema = buildSchema(
      'scalar Token enum Format { UPPER LOWER } input Options { ids:[ID!]! region:String="west" unused:Token } type Person { id:ID! label(format:Format):String } type Query { people(options:Options!):[Person] }',
    );
    (enumSchema.getType('Format') as any).getValues()[0].value = 23;
    const rule: EntityRule = {
      source: 'Directory',
      field: 'people',
      entityType: 'Person',
      revision: 'enum',
      ttlSeconds: 30,
      ordering: 'key-grouped',
      isComplete: () => true, // #9658: these fixture resolvers exhaust every requested identity group.
      scope: () => 'public',
      selection: () => true,
      identity: row => (row as any)?.id ?? null,
      batch: args => ({
        keys: (args.options as any).ids,
        withKeys: keys => ({ options: { ...(args.options as any), ids: keys } }),
      }),
    };
    const cache = createEntityCache({ store: createMemoryEntityStore(), rules: [rule] });
    const executor = jest.fn(async (req: any) =>
      execute({
        schema: enumSchema,
        document: req.document,
        variableValues: req.variables,
        rootValue: {
          people: ({ options }: any) =>
            options.ids.map((id: string) => ({
              id,
              label: ({ format }: any) => `${options.region}:${format}`,
            })),
        },
      }),
    );
    const wrap = cache.wrap(executor as Executor, 'Directory', enumSchema);
    const q = {
      document: parse(
        'query($format:Format!){people(options:{ids:["a"]}){id label(format:$format)}}',
      ),
      variables: { format: 'UPPER' },
    };
    expect(data(await wrap(q)).people[0].label).toBe('west:23');
    expect(data(await wrap(q)).people[0].label).toBe('west:23');
    expect(executor).toHaveBeenCalledTimes(1);
  });
});
