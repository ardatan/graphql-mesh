import { createRequire } from 'node:module';
import { getBatchingExecutor } from '@graphql-tools/batch-execute';
import { describe, expect, it, jest } from '@jest/globals';
import { createEntityCache, type EntityStore } from '../src/index.js';
import { createMemoryEntityStore } from '../src/memory-store.js';
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

const { buildSchema, execute, GraphQLError, parse, validate, print } = createRequire(__filename)(
  'graphql',
) as typeof import('graphql');

// #9658: Hive batches public products with live private profile delegates inside one source request.
function fixture() {
  const schema =
    buildSchema(`scalar PrivateToken input Sku { in:[String!]! } input Filters { sku:Sku! } input Pagination { limit:Int! }
    type Product { sku:String! name:String ownerVendor:String } type Profile { id:ID! name:String } type Query {
      products(filters:Filters!,pagination:Pagination!):[Product]
      userProfiles(id:ID!,token:PrivateToken):[Profile] criticalProfile:Profile!
    } type Mutation { updateProduct:Product }`);
  const scalar = schema.getType('PrivateToken') as any;
  scalar.parseValue = (value: string) => 'private:' + value;
  scalar.parseLiteral = (node: any) => 'literal:' + node.value;
  const db = new Map([
    ['a', 'Apple'],
    ['b', 'Bread'],
  ]);
  const calls: Array<{ roots: string[]; variables: any; document: string }> = [];
  const tokens: unknown[] = [];
  const entries: any[] = [];
  const source = createMemoryEntityStore();
  const store: EntityStore = {
    ...source,
    async write(...args) {
      entries.push(args[1]);
      return source.write(...args);
    },
  };
  const cache = createEntityCache({ store, rules: [strapiProductEntityRule] });
  let profile = 'Profile 1';
  let fail = false;
  let delay: { entered(): void; release: Promise<void> } | undefined;
  const executor = jest.fn(async (request: any) => {
    calls.push({
      roots: request.document.definitions[0].selectionSet.selections.map(
        (field: any) => field.name.value,
      ),
      variables: request.variables,
      document: print(request.document),
    });
    const errors = validate(schema, request.document);
    if (errors.length) return { errors };
    const result = await execute({
      schema,
      document: request.document,
      variableValues: request.variables,
      operationName: request.operationName,
      contextValue: request.context,
      rootValue: {
        products: ({ filters }: any) =>
          filters.sku.in.map((sku: string) => ({
            sku,
            name: db.get(sku),
            ownerVendor: 'private-owner',
          })),
        userProfiles: ({ id, token }: any, context: any) => {
          tokens.push(token);
          if (fail) throw new GraphQLError('private source error');
          return [{ id, name: `${profile}:${context?.user ?? 'default'}` }];
        },
        criticalProfile: () => {
          if (fail) throw new GraphQLError('private non-null error');
          return { id: 'p', name: profile };
        },
        updateProduct: () => {
          db.set('a', 'Updated by mutation');
          return { sku: 'a', name: db.get('a') };
        },
      },
    });
    if (delay) {
      const gate = delay;
      delay = undefined;
      gate.entered();
      await gate.release;
    }
    return result;
  });
  const product = {
    document: parse(
      'query($filters:Filters!){products(filters:$filters,pagination:{limit:1000}){sku name}}',
    ),
    variables: { filters: { sku: { in: ['a'] } } },
  };
  const privateRoot = {
    document: parse(
      'query($owner:ID!,$token:PrivateToken){userProfiles(id:$owner,token:$token){id name}}',
    ),
    variables: { owner: 'private-owner', token: 'x' },
  };
  const mixed = {
    document: parse(
      'query($filters:Filters!,$owner:ID!,$token:PrivateToken){catalog:products(filters:$filters,pagination:{limit:1000}){sku name} live:userProfiles(id:$owner,token:$token){id name}}',
    ),
    variables: { ...product.variables, ...privateRoot.variables },
  };
  return {
    schema,
    db,
    calls,
    tokens,
    entries,
    store,
    cache,
    executor,
    product,
    privateRoot,
    mixed,
    read: cache.wrap(executor as any, 'Strapi', schema),
    setProfile: (value: string) => {
      profile = value;
    },
    setFail: () => {
      fail = true;
    },
    delay: (gate: { entered(): void; release: Promise<void> }) => {
      delay = gate;
    },
  };
}
const data = (value: any) => JSON.parse(JSON.stringify(value.data));

describe('mixed native entity and live roots', () => {
  it('uses installed Hive batching executor: cold one call, warm private-only call, no cached profiles', async () => {
    const f = fixture();
    const context = { user: 'first' };
    const batch = getBatchingExecutor(context, f.read);
    const run = () =>
      Promise.all([batch({ ...f.product, context }), batch({ ...f.privateRoot, context })]);
    const cold: any[] = await run();
    f.setProfile('Profile 2');
    const warm: any[] = await run();
    expect(cold.every(result => !result.errors)).toBe(true);
    expect(warm.every(result => !result.errors)).toBe(true);
    expect(data(warm[0])).toEqual(data(cold[0]));
    expect(warm[1].data.userProfiles[0].name).toBe('Profile 2:first');
    expect(f.calls.map(call => call.roots)).toEqual([
      ['products', 'userProfiles'],
      ['userProfiles'],
    ]);
    expect(f.cache.metrics.writes).toBe(1);
    expect(f.cache.metrics.hits).toBe(1);
    expect(f.tokens).toEqual(['private:x', 'private:x']);
    expect(JSON.stringify(f.entries)).not.toMatch(/Profile|private-owner|private:x/);
    expect(f.calls[1].document).not.toContain('Filters');
  });
  it('executes each caller private root independently after shared canonical warming', async () => {
    const f = fixture();
    await f.read(f.mixed);
    const [a, b]: any[] = await Promise.all([
      f.read({ ...f.mixed, context: { user: 'A' } }),
      f.read({ ...f.mixed, context: { user: 'B' } }),
    ]);
    expect(a.data.live[0].name).toBe('Profile 1:A');
    expect(b.data.live[0].name).toBe('Profile 1:B');
    expect(f.calls.map(call => call.roots)).toEqual([
      ['products', 'userProfiles'],
      ['userProfiles'],
      ['userProfiles'],
    ]);
    expect(f.cache.metrics.coalesced).toBe(0);
    expect(f.cache.pendingCount()).toBe(0);
  });
  it('conservatively executes the untouched full batch on a partial hit', async () => {
    const f = fixture();
    await f.read(f.mixed);
    f.db.set('a', 'Changed');
    const request = {
      ...f.mixed,
      variables: { ...f.mixed.variables, filters: { sku: { in: ['a', 'b'] } } },
    };
    const result: any = await f.read(request);
    expect(result.errors).toBeUndefined();
    expect(result.data.catalog[0].name).toBe('Changed');
    expect(f.calls[1].roots).toEqual(['products', 'userProfiles']);
    expect(f.calls[1].document).toBe(print(request.document));
  });
  it('reruns the original full batch on warm private errors and preserves non-null bubbling and paths', async () => {
    const f = fixture();
    const request = {
      ...f.mixed,
      document: parse(
        'query($filters:Filters!){catalog:products(filters:$filters,pagination:{limit:1000}){sku name} private:criticalProfile{id name}}',
      ),
      variables: f.product.variables,
    };
    await f.read(request);
    f.setFail();
    const result: any = await f.read(request);
    const expected = await f.executor(request);
    expect(data(result)).toBeNull();
    expect(result.errors[0].path).toEqual(['private']);
    expect(result.errors[0].message).toBe(expected.errors![0].message);
    expect(f.calls[1].roots).toEqual(['criticalProfile']);
    expect(f.calls[2].roots).toEqual(['products', 'criticalProfile']);
    expect(f.cache.metrics.writes).toBe(1);
  });
  it('refetches canonical data if invalidated while the warm private read is pending', async () => {
    const f = fixture();
    await f.read(f.mixed);
    let entered!: () => void;
    let release!: () => void;
    const started = new Promise<void>(resolve => {
      entered = resolve;
    });
    const gate = new Promise<void>(resolve => {
      release = resolve;
    });
    f.delay({ entered, release: gate });
    const waiting = f.read(f.mixed);
    await started;
    f.db.set('a', 'Committed');
    await f.cache.invalidate({
      source: 'Strapi',
      entityType: 'Product',
      scope: 'public-catalog',
      identities: ['a'],
    });
    release();
    const result: any = await waiting;
    expect(result.data.catalog[0].name).toBe('Committed');
    expect(f.calls.map(call => call.roots)).toEqual([
      ['products', 'userProfiles'],
      ['userProfiles'],
      ['products', 'userProfiles'],
    ]);
  });
  it('closes a transformed warm stream before the original full request fallback', async () => {
    const f = fixture();
    await f.read(f.mixed);
    let closed = 0;
    let calls = 0;
    const source = async (request: any) => {
      calls++;
      if (request.document.definitions[0].selectionSet.selections.length > 1)
        return f.executor(request);
      return {
        [Symbol.asyncIterator]() {
          return {
            next: async () => ({ done: true }),
            return: async () => {
              closed++;
              return { done: true };
            },
          };
        },
      };
    };
    const result: any = await f.cache.wrap(source as any, 'Strapi', f.schema)(f.mixed);
    expect(result.data.catalog[0].name).toBe('Apple');
    expect(closed).toBe(1);
    expect(calls).toBe(2);
  });
  it('never extracts a different approved operation when the selected operation includes private fields', async () => {
    const f = fixture();
    const request = {
      ...f.mixed,
      document: parse(
        'query Approved($filters:Filters!,$owner:ID!,$token:PrivateToken){catalog:products(filters:$filters,pagination:{limit:1000}){sku name} live:userProfiles(id:$owner,token:$token){id}} query Selected($filters:Filters!){products(filters:$filters,pagination:{limit:1000}){sku name ownerVendor}}',
      ),
      operationName: 'Selected',
    };
    const result: any = await f.read(request);
    expect(result.errors).toBeUndefined();
    expect(result.data.products[0].ownerVendor).toBe('private-owner');
    expect(f.cache.metrics.writes).toBe(0);
    expect(f.entries).toEqual([]);
    expect(f.calls[0].document).toBe(print(request.document));
  });
  it.each([{ returned: [] }, { returned: [null] }])(
    'treats empty/short cache reads as misses rather than fabricating an empty canonical root',
    async ({ returned }) => {
      const f = fixture();
      const cache = createEntityCache({
        store: { ...f.store, read: async () => returned },
        rules: [strapiProductEntityRule],
      });
      const request = {
        ...f.mixed,
        variables: { ...f.mixed.variables, filters: { sku: { in: ['a', 'b'] } } },
      };
      const result: any = await cache.wrap(f.executor as any, 'Strapi', f.schema)(request);
      expect(result.data.catalog).toHaveLength(2);
      expect(f.calls[0].roots).toEqual(['products', 'userProfiles']);
    },
  );
  it('reruns the full original query when a warm live response omits a required root or has extensions', async () => {
    const f = fixture();
    await f.read(f.mixed);
    for (const live of [
      { data: {} },
      { data: { live: [{ id: 'p', name: 'Profile' }] }, extensions: { source: 'private' } },
    ]) {
      const source = jest.fn(async (req: any) =>
        req.document.definitions[0].selectionSet.selections.length === 1 ? live : f.executor(req),
      );
      const result: any = await f.cache.wrap(source as any, 'Strapi', f.schema)(f.mixed);
      expect(result.data.catalog[0].name).toBe('Apple');
      expect(result.data.live).toHaveLength(1);
      expect(source).toHaveBeenCalledTimes(2);
    }
  });
  it('keeps missing-identity mixed projections untouched without injecting or caching extra fields', async () => {
    const f = fixture();
    const rule = { ...strapiProductEntityRule, identityField: 'sku' };
    const cache = createEntityCache({ store: f.store, rules: [rule] });
    const request = {
      ...f.mixed,
      document: parse(
        'query($filters:Filters!,$owner:ID!,$token:PrivateToken){catalog:products(filters:$filters,pagination:{limit:1000}){name} live:userProfiles(id:$owner,token:$token){id}}',
      ),
    };
    const result: any = await cache.wrap(f.executor as any, 'Strapi', f.schema)(request);
    expect(data(result).catalog).toEqual([{ name: 'Apple' }]);
    expect(cache.metrics.writes).toBe(0);
    expect(f.calls[0].document).toBe(print(request.document));
  });
  it('refetches the untouched request when the final fence array is truncated', async () => {
    const f = fixture();
    await f.read(f.mixed);
    f.db.set('a', 'Changed');
    let snapshots = 0;
    const store = {
      ...f.store,
      snapshot: async (...args: Parameters<EntityStore['snapshot']>) =>
        ++snapshots === 1 ? f.store.snapshot(...args) : [],
    };
    const cache = createEntityCache({ store, rules: [strapiProductEntityRule] });
    const result: any = await cache.wrap(f.executor as any, 'Strapi', f.schema)(f.mixed);
    expect(result.data.catalog[0].name).toBe('Changed');
    expect(f.calls.map(call => call.roots)).toEqual([
      ['products', 'userProfiles'],
      ['userProfiles'],
      ['products', 'userProfiles'],
    ]);
  });
  it('keeps invalid root arguments and conflicting aliases as original source validation errors', async () => {
    const f = fixture();
    await f.read(f.mixed);
    for (const query of [
      'query($filters:Filters!,$owner:ID!,$token:PrivateToken){catalog:products(filters:$filters,pagination:{limit:1000},unknown:1){sku name} live:userProfiles(id:$owner,token:$token){id name}}',
      'query($filters:Filters!,$owner:ID!,$token:PrivateToken){catalog:products(filters:$filters,pagination:{limit:1000}){sku name} catalog:userProfiles(id:$owner,token:$token){id name}}',
    ]) {
      const result: any = await f.read({ ...f.mixed, document: parse(query) });
      expect(result.errors?.length).toBeGreaterThan(0);
      expect(result.data).toBeUndefined();
    }
    expect(f.cache.metrics.writes).toBe(1);
  });
  it('fences a selected second mutation definition before and after the write', async () => {
    const f = fixture();
    await f.read(f.product);
    const request = {
      document: parse(
        'query First($filters:Filters!){products(filters:$filters,pagination:{limit:1000}){sku name}} mutation Edit {updateProduct{sku name}}',
      ),
      variables: f.product.variables,
      operationName: 'Edit',
    };
    const mutation: any = await f.read(request);
    expect(mutation.errors).toBeUndefined();
    const fresh: any = await f.read(f.product);
    expect(fresh.data.products[0].name).toBe('Updated by mutation');
    expect(f.cache.metrics.invalidations).toBe(2);
    expect(f.calls).toHaveLength(3);
  });
});
