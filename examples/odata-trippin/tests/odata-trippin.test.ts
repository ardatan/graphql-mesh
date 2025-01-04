import { basename, join } from 'path';
import { introspectionFromSchema, lexicographicSortSchema } from 'graphql';
import { findAndParseConfig } from '@graphql-mesh/cli';
import { getMesh, MeshInstance } from '@graphql-mesh/runtime';
import { ProcessedConfig } from '../../../packages/legacy/config/dist/typings/process';

describe('OData TripPin', () => {
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
    ).toMatchSnapshot('odata-trippin-schema');
  });
  it('should give correct response for example queries', async () => {
    for (const source of config.documents) {
      if (!source.document || !source.location) {
        continue;
      }
      const result = await mesh.execute(source.document);
      expect(result).toMatchSnapshot(basename(source.location) + '-query-result');
    }
  });
  afterAll(() => mesh?.destroy());
});
