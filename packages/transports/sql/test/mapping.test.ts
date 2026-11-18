import { columnMapFromSelection, parseSqlMapping, resolveMappingValue } from '../src/mapping.js';
import { parseSqlThrough } from '../src/through.js';

describe('parseSqlMapping', () => {
  it('parses column selection and skips comments', () => {
    const parsed = parseSqlMapping(`
      # Album columns
      id: AlbumId
      title: Title
      artistId: ArtistId
    `);
    expect(columnMapFromSelection(parsed)).toEqual(
      new Map([
        ['id', 'AlbumId'],
        ['title', 'Title'],
        ['artistId', 'ArtistId'],
      ]),
    );
  });

  it('parses $args / $this, spreads, and nested blocks', () => {
    const parsed = parseSqlMapping(`
      ArtistId: $this.artistId
      ...$args.where
      set {
        Title: $args.input.title
      }
      where {
        AlbumId: $args.id
      }
    `);
    expect(parsed.entries[0].value).toEqual({
      kind: 'this',
      value: 'artistId',
      path: ['artistId'],
    });
    expect(parsed.entries[1]).toMatchObject({
      spread: true,
      key: '...$args.where',
      value: {
        kind: 'args',
        value: 'where',
        path: ['where'],
      },
    });
    const set = parsed.entries.find(e => e.key === 'set');
    expect(set?.children?.[0].key).toBe('Title');
    expect(
      resolveMappingValue(set?.children?.[0].value, {
        args: { input: { title: 'X' } },
      }),
    ).toBe('X');
  });

  it('parses bare $args.where as a whole-value binder', () => {
    const parsed = parseSqlMapping(`$args.where`);
    expect(parsed.entries).toEqual([
      {
        key: '$args.where',
        value: { kind: 'args', value: 'where', path: ['where'] },
      },
    ]);
  });

  it('parses @sql(through) many-to-many blocks', () => {
    expect(
      parseSqlThrough(`
        table: playlist_track
        local: PlaylistId
        remote: TrackId
        parent: $this.id
        target: TrackId
      `),
    ).toEqual({
      table: 'playlist_track',
      localColumn: 'PlaylistId',
      remoteColumn: 'TrackId',
      parentPath: ['id'],
      targetColumn: 'TrackId',
    });
  });

  it('throws on nonempty incomplete @sql(through) config', () => {
    expect(() =>
      parseSqlThrough(`
        table: playlist_track
        local: PlaylistId
      `),
    ).toThrow(/through/);
    expect(parseSqlThrough('')).toBeUndefined();
    expect(parseSqlThrough(null)).toBeUndefined();
  });

  it('parses $fn computed-column selections', () => {
    const parsed = parseSqlMapping(`
      id: id
      fullName: $fn.public.users_full_name
    `);
    expect(parsed.entries[1].value).toEqual({
      kind: 'fn',
      value: 'public.users_full_name',
      path: ['public', 'users_full_name'],
    });
    expect(columnMapFromSelection(parsed)).toEqual(new Map([['id', 'id']]));
  });

  it('parses connection wrappers and pseudos', () => {
    const parsed = parseSqlMapping(`
      nodes {
        id: AlbumId
      }
      totalCount: $totalCount
      $
    `);
    expect(parsed.entries[0].children?.[0].value).toEqual({
      kind: 'column',
      value: 'AlbumId',
    });
    expect(parsed.entries[1].value).toEqual({ kind: 'pseudo', value: 'totalCount' });
    expect(parsed.entries[2].value).toEqual({ kind: 'pseudo', value: '$' });
  });
});
