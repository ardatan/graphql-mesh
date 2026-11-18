import { join } from 'path';
import { lexicographicSortSchema } from 'graphql';
import { findAndParseConfig } from '@graphql-mesh/cli';
import { getMesh, MeshInstance } from '@graphql-mesh/runtime';
import { printSchemaWithDirectives } from '@graphql-tools/utils';

describe('Mongoose', () => {
  let mesh: MeshInstance;
  beforeAll(async () => {
    const config = await findAndParseConfig({
      dir: join(__dirname, '..'),
    });
    mesh = await getMesh(config);
  });
  it('should generate correct schema', async () => {
    // printSchema omits field/schema directive applications; keep @mongo__* / @transport visible.
    expect(printSchemaWithDirectives(lexicographicSortSchema(mesh.schema))).toMatchSnapshot();
  });
  afterAll(() => {
    mesh?.destroy();
  });
});
