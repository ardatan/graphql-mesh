import { join } from 'node:path';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { loadGraphQLSchemaFromSql } from '../src/index.js';

const chinookDb = join(__dirname, '../../../../e2e/sqlite-chinook/chinook.db');

describe('@omnigraph/sql sqlite chinook', () => {
  it('emits @sql directives and slim @transport(kind: sql)', async () => {
    // Dialect inferred from path / file: (Bun-style; type optional)
    const schema = await loadGraphQLSchemaFromSql('chinook', {
      connectionString: chinookDb,
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
});
