import { parseSqlMapping } from '../src/mapping.js';
import { buildSelect, escapeSqlStringLiteral, mapRowToGraphql } from '../src/sql-builder.js';

describe('buildSelect', () => {
  const selection = parseSqlMapping(`
    id: AlbumId
    title: Title
    artistId: ArtistId
  `);

  it('builds ROW by id', () => {
    const { sql, params } = buildSelect('sqlite', {
      table: 'albums',
      kind: 'ROW',
      selection,
      whereMapping: parseSqlMapping(`AlbumId: $args.id`),
      graphqlArgs: { id: '1' },
    });
    expect(sql).toContain('FROM "albums"');
    expect(sql).toContain('"AlbumId" = ?');
    expect(sql).toContain('LIMIT ?');
    expect(params).toEqual(['1', 1]);
  });

  it('builds filtered ROWS with order and limit via ...$args.where spread', () => {
    const { sql, params } = buildSelect('sqlite', {
      table: 'albums',
      kind: 'ROWS',
      selection,
      whereMapping: parseSqlMapping(`...$args.where`),
      planners: {
        orderBy: '$args.orderBy',
        limit: '$args.limit',
        offset: '$args.offset',
      },
      graphqlArgs: {
        where: { title: { startsWith: 'For' } },
        orderBy: ['TITLE_ASC'],
        limit: 2,
        offset: 0,
      },
    });
    expect(sql).toContain('"Title" LIKE ?');
    expect(sql).toContain('ORDER BY "Title" ASC');
    expect(params[0]).toBe('For%');
    expect(params).toContain(2);
  });

  it('merges join equality with ...$args.where spread', () => {
    const { sql, params } = buildSelect('sqlite', {
      table: 'albums',
      kind: 'ROWS',
      selection,
      whereMapping: parseSqlMapping(`
        ArtistId: $this.id
        ...$args.where
      `),
      planners: {
        orderBy: '$args.orderBy',
        limit: '$args.limit',
      },
      parent: { id: 42 },
      graphqlArgs: {
        where: { title: { eq: 'X' } },
        orderBy: ['TITLE_ASC'],
        limit: 5,
      },
    });
    expect(sql).toContain('"ArtistId" = ?');
    expect(sql).toContain('"Title" = ?');
    expect(params[0]).toBe(42);
    expect(params[1]).toBe('X');
  });

  it('maps rows to GraphQL fields and stringifies id', () => {
    expect(mapRowToGraphql({ AlbumId: 1, Title: 'A', ArtistId: 2 }, selection)).toEqual({
      id: '1',
      title: 'A',
      artistId: 2,
    });
  });

  it('escapes backslash before quotes in SQL string literals', () => {
    // CodeQL js/incomplete-sanitization: `\` must be doubled first.
    expect(escapeSqlStringLiteral("a\\b'c", 'mysql')).toBe("a\\\\b\\'c");
    expect(escapeSqlStringLiteral("a\\b'c", 'sqlite')).toBe("a\\\\b''c");
    expect(escapeSqlStringLiteral('\\', 'mysql')).toBe('\\\\');
    expect(escapeSqlStringLiteral("'", 'mysql')).toBe("\\'");
  });

  it('embeds escaped JSON keys in mysql/sqlite has-many subselects', () => {
    const hasMany = [
      {
        fieldName: 'albums',
        table: 'albums',
        joinColumn: 'ArtistId',
        parentGraphqlField: 'id',
        parentColumn: 'ArtistId',
        selection: {
          entries: [
            {
              key: "title\\'x",
              value: { kind: 'column' as const, value: 'Title' },
            },
          ],
        },
        limit: 2,
      },
    ];

    const mysql = buildSelect('mysql', {
      table: 'artists',
      kind: 'ROWS',
      selection: parseSqlMapping(`id: ArtistId`),
      whereMapping: parseSqlMapping(`limit: $args.limit`),
      graphqlArgs: { limit: 1 },
      hasMany,
    });
    expect(mysql.sql).toContain(`'${escapeSqlStringLiteral("title\\'x", 'mysql')}'`);

    const sqlite = buildSelect('sqlite', {
      table: 'artists',
      kind: 'ROWS',
      selection: parseSqlMapping(`id: ArtistId`),
      whereMapping: parseSqlMapping(`limit: $args.limit`),
      graphqlArgs: { limit: 1 },
      hasMany,
    });
    expect(sqlite.sql).toContain(`'${escapeSqlStringLiteral("title\\'x", 'sqlite')}'`);
  });
});
