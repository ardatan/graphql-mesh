import { buildSchema, execute, GraphQLError, Kind, parse } from 'graphql';
import { describe, expect, it, jest } from '@jest/globals';
import { createEntityCache, planEntityBatch } from '../src/index.js';
import { createMemoryEntityStore } from '../src/memory-store.js';
import { strapiProductEntityRule } from './catalog-fixture.js';
import { instrumentationProjection } from './instrumentation-projection.fixture.js';

const sdl =
  'input Sku { in:[String!] } input Filters { sku:Sku } input Pagination { limit:Int } type Media {documentId:ID name:String url:String} type Product {sku:String! documentId:ID name:String privateOwner:String featuredImage:Media images(pagination:Pagination):[Media]} type Query {products(filters:Filters,pagination:Pagination):[Product] userProfiles:[String]}';
const schema = buildSchema(sdl),
  rule = {
    ...strapiProductEntityRule,
    projection: instrumentationProjection,
    revision: 'fixture-v4-projection',
    scope: () => 'public-catalog',
  };
const request = (selection: string, alias = 'products', variables?: any) => ({
  document: parse(
    `query($show:Boolean=true){${alias}:products(filters:{sku:{in:["a"]}},pagination:{limit:1000})${selection}}`,
  ),
  variables,
});
const internal =
  '{sku documentId name __responseCacheTypeName:__typename featuredImage{name url __responseCacheTypeName:__typename __responseCacheId:documentId}}';
const publicFields =
  '{__typename name featuredImage{documentId __typename url name} documentId sku}';
function fixture(overrides: any = {}) {
  const store = createMemoryEntityStore();
  const writes = jest.fn(store.write.bind(store));
  store.write = writes;
  const source = jest.fn((req: any) =>
    execute({
      schema,
      document: req.document,
      variableValues: req.variables,
      rootValue: {
        products: () => [
          {
            sku: 'a',
            documentId: 'product-a',
            name: 'Canonical',
            privateOwner: 'private',
            featuredImage: { documentId: 'image-a', name: 'photo', url: '/photo' },
          },
        ],
        userProfiles: () => ['fresh'],
      },
    }),
  );
  const a = createEntityCache({ store, rules: [{ ...rule, ...overrides }] }),
    b = createEntityCache({ store, rules: [{ ...rule, ...overrides }] });
  return {
    store,
    writes,
    source,
    a,
    b,
    first: a.wrap(source, 'Strapi', schema),
    second: b.wrap(source, 'Strapi', schema),
  };
}

describe('proved Strapi instrumentation projection reuse', () => {
  // #9658: cold upstream keeps its aliases, stored rows are canonical, each caller gets its own shape.
  it('reuses canonical rows across gateway aliases and field order without extra fill', async () => {
    const f = fixture(),
      cold = request(internal),
      warm = request(publicFields, 'publicAlias');
    const expected = await f.source(warm);
    f.source.mockClear();
    await f.first(cold);
    const calls = f.source.mock.calls.length,
      writes = f.writes.mock.calls.length;
    expect(await f.second(warm)).toEqual(expected);
    expect(f.source).toHaveBeenCalledTimes(calls);
    expect(f.writes).toHaveBeenCalledTimes(writes);
    const row = (f.writes.mock.calls[0][1] as any).rows[0];
    expect(row.__typename).toBe('Product');
    expect(row.featuredImage.documentId).toBe('image-a');
    expect(JSON.stringify(row)).not.toContain('__responseCache');
    expect(planEntityBatch(cold, schema, rule)!.selection).toBe(
      planEntityBatch(warm, schema, rule)!.selection,
    );
  });
  it('coalesces canonical misses but decodes each caller independently', async () => {
    const f = fixture();
    let release!: () => void;
    const gate = new Promise<void>(done => {
      release = done;
    });
    const original = f.source.getMockImplementation()!;
    f.source.mockImplementation(async req => {
      await gate;
      return original(req);
    });
    const cold = f.first(request(internal)),
      warm = f.first(request(publicFields));
    await new Promise(done => setTimeout(done, 5));
    release();
    const [a, b] = await Promise.all([cold, warm]);
    expect((a as any).data.products[0].__responseCacheTypeName).toBe('Product');
    expect((b as any).data.products[0].__typename).toBe('Product');
    expect(f.source).toHaveBeenCalledTimes(1);
    expect(f.a.metrics.coalesced).toBe(1);
  });
  it('keeps private roots fresh in a warm mixed batch', async () => {
    const f = fixture();
    const mixed = (fields: string) => ({
      ...request(fields),
      document: parse(
        `{catalog:products(filters:{sku:{in:["a"]}},pagination:{limit:1000})${fields} private:userProfiles}`,
      ),
    });
    await f.first(mixed(internal));
    f.source.mockImplementation(req =>
      execute({
        schema,
        document: req.document,
        rootValue: { userProfiles: () => ['fresh-second'] },
      }),
    );
    const result: any = await f.second(mixed(publicFields));
    expect(result.data.private).toEqual(['fresh-second']);
    expect(result.data.catalog[0].name).toBe('Canonical');
    expect(f.writes).toHaveBeenCalledTimes(1);
    expect(f.source).toHaveBeenCalledTimes(2);
  });
  it.each(['errors', 'extensions', 'stream'])(
    'retains original %s fallback and aliases without caching',
    async mode => {
      const f = fixture(),
        req = request(internal);
      const result: any =
        mode === 'errors'
          ? {
              data: { products: [{ sku: 'a', __responseCacheTypeName: 'Product' }] },
              errors: [
                new GraphQLError('source', { path: ['products', 0, '__responseCacheTypeName'] }),
              ],
            }
          : mode === 'extensions'
            ? { data: { products: [] }, extensions: { source: true } }
            : {
                [Symbol.asyncIterator]: async function* () {
                  yield { data: { products: [] } };
                },
              };
      f.source.mockResolvedValueOnce(result);
      expect(await f.first(req)).toBe(result);
      expect(f.writes).not.toHaveBeenCalled();
      expect(f.source).toHaveBeenCalledTimes(1);
    },
  );
  it('preserves unknown aliases and rejects ambiguous response aliases', async () => {
    const f = fixture();
    await f.first(request('{sku name}'));
    await f.second(request('{sku label:name}'));
    expect(f.source).toHaveBeenCalledTimes(2);
    expect(
      planEntityBatch(
        request('{sku __responseCacheTypeName:__typename __responseCacheTypeName:name}'),
        schema,
        rule,
      ),
    ).toBeNull();
  });
  it('does not admit extra private fields or omitted identity/media fields', async () => {
    const f = fixture();
    await f.first(request(publicFields));
    await f.second(request('{sku name privateOwner}'));
    expect(f.source).toHaveBeenCalledTimes(2);
    const different = request('{sku name featuredImage{url}}');
    expect(planEntityBatch(different, schema, rule)!.selection).not.toBe(
      planEntityBatch(request(publicFields), schema, rule)!.selection,
    );
  });
  it('keeps field arguments, directives and resolved variables in the key', () => {
    const fields = (limit: number) =>
      `{sku images(pagination:{limit:${limit}}){url} name @include(if:$show)}`;
    expect(
      planEntityBatch(request(fields(1), 'products', { show: true }), schema, rule)!.selection,
    ).not.toBe(
      planEntityBatch(request(fields(2), 'products', { show: true }), schema, rule)!.selection,
    );
    expect(
      planEntityBatch(request(fields(1), 'products', { show: true }), schema, rule)!.selection,
    ).not.toBe(
      planEntityBatch(request(fields(1), 'products', { show: false }), schema, rule)!.selection,
    );
  });
  // #9658: callbacks receive detached input and cannot retain a mutable stored/caller result reference.
  it('detaches rows before and after each projection callback', async () => {
    let encoded: any, decoded: any;
    const f = fixture({
      projection: (field: any, current: any) => {
        const base = rule.projection!(field, current)!;
        return {
          ...base,
          encode: (input: any) => {
            const copy = structuredClone(input);
            input.name = 'mutated input';
            encoded = base.encode(copy);
            return encoded;
          },
          decode: (input: any) => {
            const copy = structuredClone(input);
            input.name = 'mutated stored input';
            decoded = base.decode(copy);
            return decoded;
          },
        };
      },
    });
    const cold: any = await f.first(request(internal));
    expect(cold.data.products[0].name).toBe('Canonical');
    expect((f.source.mock.results[0].value as any).data.products[0].name).toBe('Canonical');
    encoded.name = 'late mutation';
    decoded.name = 'late caller mutation';
    const warm: any = await f.second(request(publicFields));
    expect(warm.data.products[0].name).toBe('Canonical');
    decoded.name = 'another mutation';
    expect(((await f.second(request(publicFields))) as any).data.products[0].name).toBe(
      'Canonical',
    );
    expect(f.source).toHaveBeenCalledTimes(1);
  });
  it.each(['encode', 'decode'])(
    'fails open on %s callback exception without poisoned output',
    async mode => {
      let throwing = false;
      const f = fixture({
        projection: (field: any, current: any) => {
          const base = rule.projection!(field, current)!;
          return {
            ...base,
            [mode]: (row: any) => {
              if (throwing) {
                row.name = 'mutated before failure';
                throw Error('projection failed');
              }
              return (base as any)[mode](row);
            },
          };
        },
      });
      if (mode === 'decode') await f.first(request(internal));
      throwing = true;
      const result: any = await f.second(request(publicFields));
      expect(result.data.products[0].name).toBe('Canonical');
      expect(result.data.products[0].__typename).toBe('Product');
      expect(f.writes).toHaveBeenCalledTimes(mode === 'encode' ? 0 : 1);
      if (mode === 'decode') {
        throwing = false;
        const calls = f.source.mock.calls.length;
        expect(((await f.second(request(publicFields))) as any).data.products[0].name).toBe(
          'Canonical',
        );
        expect(f.source).toHaveBeenCalledTimes(calls);
      }
    },
  );
  it.each(['encode', 'decode'])(
    'keeps the complete mixed native fallback intact on %s failure',
    async mode => {
      let throwing = false;
      const f = fixture({
        projection: (field: any, current: any) => {
          const base = rule.projection!(field, current)!;
          return {
            ...base,
            [mode]: (row: any) => {
              if (throwing) {
                row.name = 'mutated before mixed failure';
                throw Error('mixed projection failed');
              }
              return (base as any)[mode](row);
            },
          };
        },
      });
      const mixed = (fields: string) => ({
        document: parse(
          `{catalog:products(filters:{sku:{in:["a"]}},pagination:{limit:1000})${fields} private:userProfiles}`,
        ),
      });
      if (mode === 'decode') await f.first(mixed(internal));
      throwing = true;
      const result: any = await f.second(mixed(publicFields));
      expect(result.data.catalog[0].name).toBe('Canonical');
      expect(result.data.private).toEqual(['fresh']);
      expect(f.writes).toHaveBeenCalledTimes(mode === 'encode' ? 0 : 1);
    },
  );
  it('checks completeness against fetched and reconstructed caller shapes', async () => {
    const checked: any[] = [];
    const f = fixture({
      isComplete: (rows: any[]) => {
        checked.push(rows);
        return rows.every(row => row.__responseCacheTypeName === 'Product');
      },
    });
    const result: any = await f.first(request(internal));
    expect(result.data.products[0].__responseCacheTypeName).toBe('Product');
    expect(checked.length).toBeGreaterThanOrEqual(2);
    expect(checked.every(rows => rows[0].__responseCacheTypeName === 'Product')).toBe(true);
  });
  // #9658: generic completeness may depend on an identity injected outside the caller projection.
  it.each(['absent', 'identity-preserving', 'Strapi'])(
    'retains injected identity through %s projection without exposing it',
    async mode => {
      const projection =
        mode === 'absent'
          ? undefined
          : mode === 'Strapi'
            ? rule.projection
            : () => ({
                key: 'identity-preserving',
                encode: (row: any) => row,
                decode: (row: any) => row,
              });
      const f = fixture({
        projection,
        identityField: 'sku',
        selection: () => true,
        isComplete: (rows: any[]) => rows.every(row => typeof row.sku === 'string'),
      });
      const cold: any = await f.first(request('{name}')),
        warm: any = await f.second(request('{name}'));
      expect(cold).toEqual({ data: { products: [{ name: 'Canonical' }] } });
      expect(warm).toEqual(cold);
      expect(f.source).toHaveBeenCalledTimes(1);
      expect(f.writes).toHaveBeenCalledTimes(1);
    },
  );
  it('retains full schema fingerprint isolation', () => {
    const other = buildSchema(sdl.replace('name:String privateOwner', 'name:Int privateOwner'));
    expect(planEntityBatch(request('{sku name}'), schema, rule)!.selection).not.toBe(
      planEntityBatch(request('{sku name}'), other, rule)!.selection,
    );
  });
});

// #9658: opt-in projection also works for non-Strapi metadata sources; default aliases stay isolated.
describe('non-Strapi optional projection contract', () => {
  it.each([false, true])(
    'keeps native Equipment aliases with normalization=%s',
    async normalized => {
      const schema = buildSchema(
        'type Equipment {assetTag:String! documentId:ID name:String} type Query {equipmentMetadata(tags:[String!]!):[Equipment]}',
      );
      const source = jest.fn((req: any) =>
        execute({
          schema,
          document: req.document,
          rootValue: {
            equipmentMetadata: ({ tags }: any) =>
              tags.map((assetTag: string) => ({
                assetTag,
                documentId: 'asset-' + assetTag,
                name: 'Metadata',
              })),
          },
        }),
      );
      const rule: any = {
        source: 'Assets',
        field: 'equipmentMetadata',
        entityType: 'Equipment',
        revision: 'public-projection-v1',
        ttlSeconds: 86400,
        scope: () => 'public',
        ordering: 'key-grouped',
        isComplete: () => true,
        batch: (args: any) => ({
          keys: args.tags,
          withKeys: (tags: string[]) => ({ ...args, tags }),
        }),
        identity: (row: any) => row.assetTag,
        selection: (field: any) =>
          field.selectionSet.selections.every(
            (node: any) =>
              node.kind === Kind.FIELD &&
              ['assetTag', 'documentId', 'name', '__typename'].includes(node.name.value),
          ),
        ...(normalized ? { projection: instrumentationProjection } : {}),
      };
      const cache = createEntityCache({ store: createMemoryEntityStore(), rules: [rule] });
      const wrap = cache.wrap(source, 'Assets', schema);
      const internal = {
        document: parse(
          '{equipmentMetadata(tags:["T23"]){assetTag name __responseCacheTypeName:__typename __responseCacheId:documentId}}',
        ),
      };
      const publicRequest = {
        document: parse(
          '{items:equipmentMetadata(tags:["T23"]){documentId __typename name assetTag}}',
        ),
      };
      const expected = await source(publicRequest);
      source.mockClear();
      await wrap(internal);
      expect(await wrap(publicRequest)).toEqual(expected);
      expect(source).toHaveBeenCalledTimes(normalized ? 1 : 2);
    },
  );
});

// #9658: aggregate completeness fallback preserves the original executor's rejection exactly once.
it('preserves a rejecting original fallback instead of retrying it as a projection error', async () => {
  let proofs = 0;
  const f = fixture({ isComplete: () => ++proofs === 1 });
  const original = f.source.getMockImplementation()!;
  f.source.mockImplementationOnce(original).mockImplementationOnce(() => {
    throw new Error('original-fallback-rejection');
  });
  await expect(f.first(request(internal))).rejects.toThrow('original-fallback-rejection');
  expect(f.source).toHaveBeenCalledTimes(2);
  expect(f.a.metrics.cacheErrors).toBe(0);
});
