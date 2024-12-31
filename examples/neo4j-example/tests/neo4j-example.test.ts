import { basename, join } from 'path';
import { lexicographicSortSchema } from 'graphql';
import { findAndParseConfig } from '@graphql-mesh/cli';
import { ProcessedConfig } from '@graphql-mesh/config';
import { getMesh, MeshInstance } from '@graphql-mesh/runtime';
import { printSchemaWithDirectives } from '@graphql-tools/utils';

describe('Neo4j', () => {
  let mesh: MeshInstance;
  let config: ProcessedConfig;
  beforeAll(async () => {
    config = await findAndParseConfig({
      dir: join(__dirname, '..'),
    });
    config.logger = {
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      log: jest.fn(),
      child() {
        return this;
      },
    };
    mesh = await getMesh(config);
  });
  jest.setTimeout(120_000);
  it('should generate correct schema', () => {
    expect(printSchemaWithDirectives(lexicographicSortSchema(mesh.schema))).toMatchSnapshot();
  });
  it('should give correct response for example queries', async () => {
    for (const source of config.documents) {
      const result = await mesh.execute(source.document!);
      expect(result).toMatchSnapshot(basename(source.location!) + '-query-result');
    }
  });
  afterAll(() => {
    mesh?.destroy();
  });
});
