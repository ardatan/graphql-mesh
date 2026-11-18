import { resolveSqlitePath } from '../src/adapter.js';
import { parseSqlMapping } from '../src/mapping.js';
import {
  buildDelete,
  buildSelect,
  buildUpdate,
  escapeSqlStringLiteral,
  mapRowToGraphql,
} from '../src/sql-builder.js';
import { parseSqlThrough } from '../src/through.js';

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

  it('builds filtered ROWS with bare $args.where (no spread needed alone)', () => {
    const { sql, params } = buildSelect('sqlite', {
      table: 'albums',
      kind: 'ROWS',
      selection,
      whereMapping: parseSqlMapping(`$args.where`),
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

  it('supports nested belongs-to filters and like/ilike', () => {
    const { sql, params } = buildSelect('sqlite', {
      table: 'albums',
      kind: 'ROWS',
      selection,
      whereMapping: parseSqlMapping(`$args.where`),
      graphqlArgs: {
        where: {
          artist: { name: { startsWith: 'A' } },
          title: { ilike: '%rock%' },
        },
      },
      relationFilters: [
        {
          field: 'artist',
          relatedTable: 'artists',
          localColumn: 'ArtistId',
          refColumn: 'ArtistId',
          columns: new Map([['name', 'Name']]),
        },
      ],
    });
    expect(sql).toContain('EXISTS (SELECT 1 FROM "artists" AS "_rf"');
    expect(sql).toContain('"_rf"."Name" LIKE ?');
    expect(sql).toContain('"_rf"."ArtistId" = "t"."ArtistId"');
    expect(sql).toContain('LOWER("t"."Title") LIKE LOWER(?)');
    expect(params).toEqual(['A%', '%rock%']);
  });

  it('filters many-to-many via @sql(through) EXISTS', () => {
    const through = parseSqlThrough(`
      table: playlist_track
      local: PlaylistId
      remote: TrackId
      parent: $this.id
      target: TrackId
    `);
    const { sql, params } = buildSelect('sqlite', {
      table: 'tracks',
      kind: 'ROWS',
      selection: parseSqlMapping(`
        id: TrackId
        name: Name
      `),
      whereMapping: parseSqlMapping(`$args.where`),
      graphqlArgs: { where: null },
      parent: { id: 1 },
      through,
    });
    expect(sql).toContain(
      'EXISTS (SELECT 1 FROM "playlist_track" AS "_m2m" WHERE "_m2m"."PlaylistId" = ? AND "_m2m"."TrackId" = "t"."TrackId"',
    );
    expect(sql).toContain('FROM "tracks" AS "t"');
    expect(params).toEqual([1]);
  });

  it('selects postgres $fn computed columns', () => {
    const { sql } = buildSelect('postgres', {
      table: 'users',
      kind: 'ROW',
      selection: parseSqlMapping(`
        id: id
        fullName: $fn.public.users_full_name
      `),
      whereMapping: parseSqlMapping(`id: $args.id`),
      graphqlArgs: { id: 1 },
    });
    expect(sql).toContain('FROM "users" AS "t"');
    expect(sql).toContain('"public"."users_full_name"("t") AS "fullName"');
  });

  it('advances CONNECTION offset past the after cursor', () => {
    const { params } = buildSelect('sqlite', {
      table: 'albums',
      kind: 'CONNECTION',
      selection,
      whereMapping: parseSqlMapping(`$args.where`),
      planners: { first: '$args.first', after: '$args.after' },
      graphqlArgs: { where: {}, first: 1, after: Buffer.from('0', 'utf8').toString('base64') },
    });
    // first+1 for hasNextPage probe, then offset = decode(after)+1
    expect(params).toEqual([2, 1]);
  });

  it('applies structured $args.where on UPDATE and rejects unresolved binders', () => {
    const cols = new Map([['id', 'AlbumId']]);
    const upd = buildUpdate(
      'sqlite',
      'albums',
      parseSqlMapping(`Title: $args.input.title`),
      parseSqlMapping(`$args.where`),
      { input: { title: 'X' }, where: { id: { eq: 7 } } },
      ['AlbumId'],
      undefined,
      cols,
    );
    expect(upd.sql).toContain('"AlbumId" = ?');
    expect(upd.params).toEqual(['X', 7]);

    expect(() =>
      buildUpdate(
        'sqlite',
        'albums',
        parseSqlMapping(`Title: $args.input.title`),
        parseSqlMapping(`AlbumId: $args.id`),
        { input: { title: 'X' } },
        ['AlbumId'],
      ),
    ).toThrow(/resolved to undefined/);
  });

  it('appends soft-delete IS NULL on reads and soft-deletes via UPDATE', () => {
    const softDelete = { column: 'deleted_at' };
    const { sql } = buildSelect('sqlite', {
      table: 'albums',
      kind: 'ROWS',
      selection,
      whereMapping: parseSqlMapping(`$args.where`),
      planners: { limit: '$args.limit' },
      graphqlArgs: { where: {}, limit: 5 },
      softDelete,
    });
    expect(sql).toContain('"deleted_at" IS NULL');

    const del = buildDelete(
      'postgres',
      'albums',
      parseSqlMapping(`AlbumId: $args.id`),
      { id: 1 },
      softDelete,
    );
    expect(del.sql).toMatch(/^UPDATE "albums" SET "deleted_at" = NOW()/);
    expect(del.sql).toContain('"AlbumId" = $');
    expect(del.sql).toContain('"deleted_at" IS NULL');
    expect(del.sql).not.toContain('DELETE FROM');

    const skipped = buildSelect('sqlite', {
      table: 'artists',
      kind: 'ROWS',
      selection: parseSqlMapping(`id: ArtistId`),
      whereMapping: parseSqlMapping(`$args.where`),
      graphqlArgs: { where: {} },
      softDelete: { column: 'deleted_at', tables: ['albums'] },
    });
    expect(skipped.sql).not.toContain('deleted_at');
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
