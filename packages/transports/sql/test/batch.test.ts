import {
  batchableEqualityColumn,
  canBatchByEqualityColumn,
  loadBatchedByColumn,
} from '../src/batch.js';
import { parseSqlMapping } from '../src/mapping.js';
import { isLegacyPlannerEntry } from '../src/sql-builder.js';

describe('batchableEqualityColumn with catalog', () => {
  it('batches on physical PK column named limit (gql id → sql limit)', () => {
    const where = parseSqlMapping('limit: $args.id');
    // Loader selection aliases sole PK: id: limit
    const catalog = new Map([['id', 'limit']]);
    expect(batchableEqualityColumn(where, catalog)).toBe('limit');
  });

  it('does not batch on stuffed limit: $args.take when catalog has no limit column', () => {
    const where = parseSqlMapping('limit: $args.take');
    const catalog = new Map([['id', 'AlbumId']]);
    expect(batchableEqualityColumn(where, catalog)).toBeUndefined();
  });

  it('classifies has-many binders against the child catalog (not the parent)', () => {
    // Child selection: id: ChildId, cap: limit, parentId: ParentId
    const childCatalog = new Map([
      ['id', 'ChildId'],
      ['cap', 'limit'],
      ['parentId', 'ParentId'],
    ]);
    // Physical child `limit` + FK → two equality columns (not single-key batchable;
    // fold stays off DataLoader so both predicates apply).
    const physicalLimit = parseSqlMapping('ParentId: $this.id\nlimit: $this.quota');
    expect(isLegacyPlannerEntry(physicalLimit.entries[1], childCatalog)).toBe(false);
    expect(batchableEqualityColumn(physicalLimit, childCatalog)).toBeUndefined();

    // Stuffed planner `limit: $this.pageSize` with no child limit column: still a
    // single FK batch key, but has-many fold must reject the planner binder.
    const parentOnlyCatalog = new Map([
      ['id', 'ChildId'],
      ['parentId', 'ParentId'],
    ]);
    const stuffedLimit = parseSqlMapping('ParentId: $this.id\nlimit: $this.pageSize');
    expect(isLegacyPlannerEntry(stuffedLimit.entries[1], parentOnlyCatalog)).toBe(true);
    expect(batchableEqualityColumn(stuffedLimit, parentOnlyCatalog)).toBe('ParentId');
  });
});

describe('canBatchByEqualityColumn', () => {
  it('rejects parent-dependent pagination binders', () => {
    const where = parseSqlMapping('ArtistId: $this.id');
    expect(
      canBatchByEqualityColumn(where, 'ArtistId', 'ROWS', undefined, {
        limit: '$this.pageSize',
      }),
    ).toBe(false);
  });

  it('allows batching when pagination binder is absent', () => {
    const where = parseSqlMapping('ArtistId: $this.id');
    expect(canBatchByEqualityColumn(where, 'ArtistId', 'ROWS')).toBe(true);
  });
});

describe('loadBatchedByColumn loader identity', () => {
  it('shares one loader across different equality-arg values', async () => {
    const client = {
      adapter: 'sqlite' as const,
      query: jest.fn(async () => ({ rows: [{ AlbumId: 1 }, { AlbumId: 2 }] })),
    };
    const where = parseSqlMapping('AlbumId: $args.id');
    const selection = parseSqlMapping('id: AlbumId');
    const ctx: Record<string, unknown> = {};

    const [row1, row2] = await Promise.all([
      loadBatchedByColumn(
        ctx,
        {
          client: client as any,
          table: 'albums',
          kind: 'ROW',
          selection,
          whereMapping: where,
          column: 'AlbumId',
          graphqlArgs: { id: 1 },
        },
        1,
      ),
      loadBatchedByColumn(
        ctx,
        {
          client: client as any,
          table: 'albums',
          kind: 'ROW',
          selection,
          whereMapping: where,
          column: 'AlbumId',
          graphqlArgs: { id: 2 },
        },
        2,
      ),
    ]);
    // Shared loader identity (equality arg omitted) → one IN query for both keys.
    expect(client.query).toHaveBeenCalledTimes(1);
    const call = client.query.mock.calls[0] as unknown as [string, unknown[]];
    expect(call[1]).toEqual([1, 2]);
    expect(row1).toEqual({ id: '1' });
    expect(row2).toEqual({ id: '2' });
  });

  it('keeps sibling filter args in the loader identity', async () => {
    const client = {
      adapter: 'sqlite' as const,
      query: jest.fn(async () => ({ rows: [{ AlbumId: 1 }] })),
    };
    const where = parseSqlMapping('AlbumId: $args.input.id\n...$args.input.filter');
    const selection = parseSqlMapping('id: AlbumId');
    const ctx: Record<string, unknown> = {};

    await Promise.all([
      loadBatchedByColumn(
        ctx,
        {
          client: client as any,
          table: 'albums',
          kind: 'ROW',
          selection,
          whereMapping: where,
          column: 'AlbumId',
          graphqlArgs: { input: { id: 1, filter: { title: { eq: 'A' } } } },
          columnCatalog: new Map([['title', 'Title']]),
        },
        1,
      ),
      loadBatchedByColumn(
        ctx,
        {
          client: client as any,
          table: 'albums',
          kind: 'ROW',
          selection,
          whereMapping: where,
          column: 'AlbumId',
          graphqlArgs: { input: { id: 2, filter: { title: { eq: 'B' } } } },
          columnCatalog: new Map([['title', 'Title']]),
        },
        2,
      ),
    ]);
    // Different sibling filters → separate loaders (not one shared IN with first filter).
    expect(client.query).toHaveBeenCalledTimes(2);
  });
});
