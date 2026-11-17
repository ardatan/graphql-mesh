import { join } from 'node:path';
import { loadGraphQLSchemaFromSql } from '@omnigraph/sql';
import { buildPgRegistryFromSqlSchema } from '../src/pg-registry.js';

const dbPath = join(__dirname, '../../../../e2e/sqlite-chinook/chinook.db');

describe('buildPgRegistryFromSqlSchema', () => {
  it('builds codecs/resources/relations from @sql directives', async () => {
    const schema = await loadGraphQLSchemaFromSql('chinook', {
      endpoint: dbPath,
      includeTables: ['albums', 'artists'],
    });

    const { registry, tableByType, relationNames } = buildPgRegistryFromSqlSchema(schema);

    expect(tableByType.get('Album')).toBe('albums');
    expect(tableByType.get('Artist')).toBe('artists');
    expect(registry.pgResources.albums).toBeDefined();
    expect(registry.pgResources.artists).toBeDefined();
    expect(relationNames.get('Album')?.get('artist')?.kind).toBe('ROW');
    expect(relationNames.get('Artist')?.get('albums')?.kind).toBe('ROWS');
  });
});
