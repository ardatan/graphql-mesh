import { join } from 'node:path';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { graphqlFieldNameForColumn } from '../src/field-names.js';
import { loadGraphQLSchemaFromSql } from '../src/index.js';
import type { SqlColumnMeta } from '../src/introspect/types.js';
import { createDefaultNaming } from '../src/naming.js';

const chinookDb = join(__dirname, '../../../../e2e/sqlite-chinook/chinook.db');

describe('graphqlFieldNameForColumn', () => {
  const naming = createDefaultNaming();
  const col = (name: string, pk = false): SqlColumnMeta => ({
    name,
    dataType: 'TEXT',
    notNull: false,
    primaryKey: pk,
    autoIncrement: false,
  });

  it('aliases sole PK to id when no collision', () => {
    const columns = [col('user_id', true), col('email')];
    expect(graphqlFieldNameForColumn(naming, columns[0], columns[0], columns)).toBe('id');
  });

  it('keeps natural PK name when another column already maps to id', () => {
    const columns = [col('user_id', true), col('id')];
    expect(graphqlFieldNameForColumn(naming, columns[0], columns[0], columns)).toBe('userId');
    expect(graphqlFieldNameForColumn(naming, columns[1], columns[0], columns)).toBe('id');
  });
});

describe('@omnigraph/sql sqlite chinook', () => {
  it('emits @sql directives and slim @transport(kind: sql)', async () => {
    // Adapter inferred from path / file: (Bun-style; adapter optional)
    const schema = await loadGraphQLSchemaFromSql('chinook', {
      endpoint: chinookDb,
      includeTables: ['albums', 'artists'],
    });
    // Normalize absolute DB path so the snapshot is portable across machines/CI.
    const sdl = printSchemaWithDirectives(schema).replace(
      /location: "file:[^"]+"/,
      'location: "file:<chinook.db>"',
    );
    expect(sdl).toContain('@transport');
    expect(sdl).toContain('kind: "sql"');
    // Federation-ready from the loader: Mesh imports + @composeDirective
    expect(sdl).toContain('https://the-guild.dev/graphql/mesh/spec/');
    expect(sdl).toContain('@composeDirective');
    expect(sdl).toContain('@sql');
    // Adapter inferred from location — do not emit redundant options.adapter
    expect(sdl).not.toContain('adapter:');
    expect(sdl).toContain('@sql(');
    expect(sdl).toContain('kind: INSERT');
    expect(sdl).toContain('kind: ROW');
    expect(sdl).toContain('type Album');
    expect(sdl).toContain('type Artist');
    expect(sdl).toContain('allAlbums');
    // Type-level entity resolver (not Query entity: true)
    expect(sdl).toMatch(/type Album[\s\S]*@sql\([\s\S]*\$this\.id/);
    expect(sdl).not.toContain('entity: true');
    expect(sdl).toMatchSnapshot('chinook-albums-artists');
  });

  it('emits PostGraphile-style many-to-many shortcuts via through', async () => {
    const schema = await loadGraphQLSchemaFromSql('chinook', {
      endpoint: chinookDb,
      includeTables: ['playlists', 'playlist_track', 'tracks'],
    });
    const sdl = printSchemaWithDirectives(schema);

    expect(sdl).toMatch(/type Playlist[\s\S]*tracks\(where: TrackFilter/);
    expect(sdl).toMatch(/type Track[\s\S]*playlists\(where: PlaylistFilter/);
    expect(sdl).toContain('through:');
    expect(sdl).toContain('table: playlist_track');
    expect(sdl).toContain('local: PlaylistId');
    expect(sdl).toContain('remote: TrackId');
    // Junction type kept (payload / explicit access)
    expect(sdl).toContain('type PlaylistTrack');
    expect(sdl).toContain('playlistTracks(');
  });
});
