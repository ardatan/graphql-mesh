import { basename, join } from 'path';
import { introspectionFromSchema, lexicographicSortSchema, printSchema } from 'graphql';
import { findAndParseConfig } from '@graphql-mesh/cli';
import { getMesh, MeshInstance } from '@graphql-mesh/runtime';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { loadDocuments } from '@graphql-tools/load';

jest.setTimeout(30000);

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
    mesh.destroy();
  });
});
