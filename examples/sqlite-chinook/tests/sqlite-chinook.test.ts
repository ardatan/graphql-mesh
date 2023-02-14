import { basename, join } from 'path';
import { introspectionFromSchema, lexicographicSortSchema } from 'graphql';
import { findAndParseConfig } from '@graphql-mesh/cli';
import { ProcessedConfig } from '@graphql-mesh/config';
import { getMesh, MeshInstance } from '@graphql-mesh/runtime';

jest.setTimeout(30000);

describe('SQLite Chinook', () => {
  let config: ProcessedConfig;
  let mesh: MeshInstance;
  beforeAll(async () => {
    config = await findAndParseConfig({
      dir: join(__dirname, '..'),
    });
    mesh = await getMesh(config);
  });
  it('should generate correct schema', async () => {
    expect(
      introspectionFromSchema(lexicographicSortSchema(mesh.schema), {
        descriptions: false,
      }),
    ).toMatchSnapshot('sqlite-chinook-schema');
  });
  it('should give correct response for example queries', async () => {
    for (const source of config.documents || []) {
      const result = await mesh.execute(source.document!, undefined);
      expect(result).toMatchSnapshot(basename(source.location!) + '-sqlite-chinook-result');
    }
  });
  afterAll(async () => {
    mesh.destroy();
  });
});
