import { join } from 'node:path';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { loadGraphQLSchemaFromSql } from '../src/index.js';

const chinookDb = join(__dirname, '../../../../e2e/sqlite-chinook/chinook.db');

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
    expect(sdl).toContain('adapter: "sqlite"');
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
