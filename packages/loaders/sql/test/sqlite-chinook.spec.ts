import { join } from 'node:path';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { loadGraphQLSchemaFromSql } from '../src/index.js';

const chinookDb = join(__dirname, '../../../../e2e/sqlite-chinook/chinook.db');

describe('@omnigraph/sql sqlite chinook', () => {
  it('emits @sql__* directives and slim @transport(kind: sql)', async () => {
    const schema = await loadGraphQLSchemaFromSql('chinook', {
      type: 'sqlite',
      db: chinookDb,
      includeTables: ['albums', 'artists'],
    });
    // Normalize absolute DB path so the snapshot is portable across machines/CI.
    const sdl = printSchemaWithDirectives(schema).replace(
      /location: "file:[^"]+"/,
      'location: "file:<chinook.db>"',
    );
    expect(sdl).toContain('@transport');
    expect(sdl).toContain('kind: "sql"');
    expect(sdl).toContain('dialect: "sqlite"');
    expect(sdl).toContain('@sql__query');
    expect(sdl).toContain('@sql__mutation');
    expect(sdl).toContain('@sql__relation');
    expect(sdl).toContain('type Album');
    expect(sdl).toContain('type Artist');
    expect(sdl).toContain('allAlbums');
    expect(sdl).toContain('entity: true');
    expect(sdl).toMatchSnapshot('chinook-albums-artists');
  });
});
