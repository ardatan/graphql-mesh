import { basename, join } from 'path';
import { findAndParseConfig } from '@graphql-mesh/cli';
import { ProcessedConfig } from '@graphql-mesh/config';
import { getMesh, MeshInstance } from '@graphql-mesh/runtime';
import { printSchemaWithDirectives } from '@graphql-tools/utils';

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
    expect(printSchemaWithDirectives(mesh.schema)).toMatchSnapshot('sqlite-chinook-schema');
  });
  it('should give correct response for example queries', async () => {
    for (const source of config.documents || []) {
      if (!source.document || !source.location) {
        throw new Error(`Invalid source: ${source.location}`);
      }
      const result = await mesh.execute(source.document);
      expect(result).toMatchSnapshot(basename(source.location) + '-sqlite-chinook-result');
    }
  });
  afterAll(async () => {
    mesh.destroy();
  });
});
