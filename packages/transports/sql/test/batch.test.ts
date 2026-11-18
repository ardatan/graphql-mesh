import { canBatchByEqualityColumn, loadBatchedByColumn } from '../src/batch.js';
import { parseSqlMapping } from '../src/mapping.js';

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
  });
});
