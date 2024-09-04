import { join } from 'path';
import { lexicographicSortSchema, printSchema } from 'graphql';
import { findAndParseConfig } from '@graphql-mesh/cli';
import { getMesh, MeshInstance } from '@graphql-mesh/runtime';

describe('Mongoose', () => {
  let mesh: MeshInstance;
  beforeAll(async () => {
    const config = await findAndParseConfig({
      dir: join(__dirname, '..'),
    });
    mesh = await getMesh(config);
  });
  it('should generate correct schema', async () => {
    expect(printSchema(lexicographicSortSchema(mesh.schema))).toMatchSnapshot();
  });
  afterAll(() => {
    mesh?.destroy();
  });
});
