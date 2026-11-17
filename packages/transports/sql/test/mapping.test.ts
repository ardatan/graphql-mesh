import { parseSqlMapping, columnMapFromSelection, resolveMappingValue } from '../src/mapping.js';

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

  it('parses $args / $this and nested blocks', () => {
    const parsed = parseSqlMapping(`
      ArtistId: $this.artistId
      filter: $args.filter
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
    expect(parsed.entries[1].value).toEqual({
      kind: 'args',
      value: 'filter',
      path: ['filter'],
    });
    const set = parsed.entries.find(e => e.key === 'set');
    expect(set?.children?.[0].key).toBe('Title');
    expect(
      resolveMappingValue(set?.children?.[0].value, {
        args: { input: { title: 'X' } },
      }),
    ).toBe('X');
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
