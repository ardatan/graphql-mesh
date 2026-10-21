import { buildSchema, execute, parse } from 'graphql';
import type { Executor } from '@graphql-tools/utils';
import { describe, expect, it, jest } from '@jest/globals';
import { createEntityCache, type EntityRule } from '../src/index.js';
import { createMemoryEntityStore } from '../src/memory-store.js';

// #9658: native non-Strapi execution proves the reusable contract without service or business writes.
const schema = buildSchema(`
  type Image { name: String! }
  type Equipment { assetTag: ID! description: String! images: [Image!]! }
  type Query { equipmentMetadata(tags: [ID!]!): [Equipment!]! }
  type Mutation { updateEquipment: Equipment! }
`);
const rule: EntityRule = {
  source: 'Assets',
  field: 'equipmentMetadata',
  entityType: 'Equipment',
  revision: 'edge-v1',
  ttlSeconds: 86400,
  ordering: 'key-grouped',
  scope: () => 'public-metadata',
  selection: () => true,
  identity: row => (row as any)?.assetTag ?? null,
  isComplete: () => true,
  batch: args => ({ keys: args.tags as string[], withKeys: tags => ({ tags }) }),
  mutationFields: ['updateEquipment'],
};
const query = (tags = ['T23']) => ({
  document: parse(
    'query($tags:[ID!]!){equipmentMetadata(tags:$tags){assetTag description images{name}}}',
  ),
  variables: { tags },
});
const mutation = { document: parse('mutation{updateEquipment{assetTag description}}') };
const rows = (result: any) => result.data.equipmentMetadata;

function fixture() {
  let description = 'original';
  const rootValue = {
    equipmentMetadata: ({ tags }: { tags: string[] }) =>
      tags.map(assetTag => ({
        assetTag,
        description,
        images: [{ name: 'original image' }],
      })),
    updateEquipment: () => {
      description = 'committed';
      return { assetTag: 'T23', description, images: [] };
    },
  };
  const source = jest.fn(async (request: any) =>
    execute({
      schema,
      document: request.document,
      variableValues: request.variables,
      rootValue,
    }),
  );
  const store = createMemoryEntityStore();
  const cache = createEntityCache({ store, rules: [rule] });
  return {
    source,
    cache,
    store,
    rootValue,
    read: cache.wrap(source as Executor, 'Assets', schema),
  };
}

describe('native mutation iterator acquisition fences', () => {
  // #9658: a valid iterator factory/getter may commit synchronously before the first next call.
  it.each(['factory', 'getter'] as const)(
    'fences a synchronous %s commit after a post-executor cache refill',
    async boundary => {
      const f = fixture();
      await f.read(query());
      const invalidate = f.store.invalidate.bind(f.store);
      let fences = 0;
      f.store.invalidate = async (...args) => {
        await invalidate(...args);
        if (++fences === 2) expect(rows(await f.read(query()))[0].description).toBe('original');
      };
      const iterator = {
        next: jest.fn(async () => ({ done: true, value: undefined })),
        return: jest.fn(async () => ({ done: true, value: undefined })),
      };
      const commit = () => execute({ schema, document: mutation.document, rootValue: f.rootValue });
      const result =
        boundary === 'factory'
          ? {
              [Symbol.asyncIterator]: () => {
                commit();
                return iterator;
              },
            }
          : Object.defineProperty({}, Symbol.asyncIterator, {
              get() {
                commit();
                return () => iterator;
              },
            });
      f.source.mockResolvedValueOnce(result as any);
      const stream: any = await f.read(mutation);
      expect(iterator.next).not.toHaveBeenCalled();
      expect(rows(await f.read(query()))[0].description).toBe('committed');
      expect(f.cache.metrics.invalidations).toBe(3);
      await stream.return();
    },
  );

  // #9658: a read stamped before acquisition must not repopulate its stale row after the factory commits.
  it('rejects a held pre-acquisition read after a synchronous factory commit', async () => {
    const f = fixture();
    await f.read(query());
    let enteredFence!: () => void,
      releaseFence!: () => void,
      enteredRead!: () => void,
      releaseRead!: () => void;
    const fenceEntered = new Promise<void>(resolve => {
      enteredFence = resolve;
    });
    const fenceGate = new Promise<void>(resolve => {
      releaseFence = resolve;
    });
    const readEntered = new Promise<void>(resolve => {
      enteredRead = resolve;
    });
    const readGate = new Promise<void>(resolve => {
      releaseRead = resolve;
    });
    const invalidate = f.store.invalidate.bind(f.store);
    let fences = 0;
    f.store.invalidate = async (...args) => {
      await invalidate(...args);
      if (++fences === 2) {
        enteredFence();
        await fenceGate;
      }
    };
    const iterator = {
      next: jest.fn(async () => ({ done: true, value: undefined })),
      return: jest.fn(async () => ({ done: true, value: undefined })),
    };
    f.source.mockResolvedValueOnce({
      [Symbol.asyncIterator]: () => {
        execute({ schema, document: mutation.document, rootValue: f.rootValue });
        return iterator;
      },
    } as any);
    const mutationResult = f.read(mutation);
    await fenceEntered;
    f.source.mockImplementationOnce(async request => {
      const result = await execute({
        schema,
        document: request.document,
        variableValues: request.variables,
        rootValue: f.rootValue,
      });
      enteredRead();
      await readGate;
      return result;
    });
    const oldRead = f.read(query());
    await readEntered;
    releaseFence();
    const stream: any = await mutationResult;
    expect(iterator.next).not.toHaveBeenCalled();
    releaseRead();
    expect(rows(await oldRead)[0].description).toBe('committed');
    expect(f.cache.metrics.fencedWrites).toBe(1);
    expect(rows(await f.read(query()))[0].description).toBe('committed');
    await stream.return();
  });

  it.each(['factory', 'getter'] as const)(
    'fences a %s that commits and throws during stream acquisition',
    async boundary => {
      const f = fixture();
      await f.read(query());
      const invalidate = f.store.invalidate.bind(f.store);
      let fences = 0;
      f.store.invalidate = async (...args) => {
        await invalidate(...args);
        if (++fences === 2) await f.read(query());
      };
      const failure = new Error('native stream acquisition failed');
      const commitAndThrow = () => {
        execute({ schema, document: mutation.document, rootValue: f.rootValue });
        throw failure;
      };
      const result =
        boundary === 'factory'
          ? { [Symbol.asyncIterator]: commitAndThrow }
          : Object.defineProperty({}, Symbol.asyncIterator, { get: commitAndThrow });
      f.source.mockResolvedValueOnce(result as any);
      await expect(f.read(mutation)).rejects.toBe(failure);
      expect(rows(await f.read(query()))[0].description).toBe('committed');
    },
  );
});
