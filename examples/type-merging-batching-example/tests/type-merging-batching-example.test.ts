import { basename, join } from 'path';
import { inspect } from 'util';
import { lexicographicSortSchema } from 'graphql';
import { findAndParseConfig } from '@graphql-mesh/cli';
import { getMesh, MeshInstance } from '@graphql-mesh/runtime';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { ProcessedConfig } from '../../../packages/legacy/config/dist/typings/process';

jest.setTimeout(30000);

describe('Type Merging and Batching Example', () => {
  let config: ProcessedConfig;
  let mesh: MeshInstance;
  beforeAll(async () => {
    config = await findAndParseConfig({
      dir: join(__dirname, '..'),
    });
    mesh = await getMesh(config);
  });
  it('should generate correct schema', async () => {
    expect(printSchemaWithDirectives(lexicographicSortSchema(mesh.schema))).toMatchSnapshot();
  });
  it('should give correct response for example queries', async () => {
    for (const source of config.documents) {
      if (!source.document || !source.location) {
        throw new Error(`Invalid source: ${inspect(source)}`);
      }
      const result = await mesh.execute(source.document);
      expect(result).toMatchSnapshot(basename(source.location) + '-query-result');
    }
  });
  afterAll(() => mesh?.destroy());
});
