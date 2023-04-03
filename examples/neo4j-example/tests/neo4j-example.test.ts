import { basename, join } from 'path';
import { lexicographicSortSchema, printSchema } from 'graphql';
import { findAndParseConfig } from '@graphql-mesh/cli';
import { getMesh } from '@graphql-mesh/runtime';

describe('Neo4j', () => {
  let mesh: MeshInstance;
  let config: ProcessedConfig;
  beforeAll(async () => {
    config = await findAndParseConfig({
      dir: join(__dirname, '..'),
    });
    mesh = await getMesh(config);
  });
  jest.setTimeout(30000);
  it('should generate correct schema', () => {
    expect(printSchema(lexicographicSortSchema(mesh.schema))).toMatchSnapshot();
  });
  it('should give correct response for example queries', async () => {
    for (const source of config.documents) {
      const result = await mesh.execute(source.document, {});
      expect(result).toMatchSnapshot(basename(source.location) + '-query-result');
    }
  });
  afterAll(() => {
    mesh?.destroy();
  });
});
