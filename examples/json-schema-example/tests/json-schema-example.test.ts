import { promises as fsPromises } from 'fs';
import { join } from 'path';
import { findAndParseConfig } from '@graphql-mesh/cli';
import { getMesh, MeshInstance } from '@graphql-mesh/runtime';
import { printSchemaWithDirectives } from '@graphql-tools/utils';

describe('JSON Schema Example', () => {
  let mesh: MeshInstance;
  beforeAll(async () => {
    const config = await findAndParseConfig({
      dir: join(__dirname, '..'),
    });
    mesh = await getMesh(config);
  });
  it('should generate correct schema', async () => {
    expect(printSchemaWithDirectives(mesh.schema)).toMatchSnapshot();
  });
  it('should give correct response', async () => {
    const query = await fsPromises.readFile(join(__dirname, '../example-query.graphql'), 'utf8');
    const result = await mesh.execute(query);
    expect(result?.data?.me?.firstName).toBeDefined();
    expect(result?.data?.me?.jobTitle).toBeDefined();
    expect(result?.data?.me?.lastName).toBeDefined();
    expect(result?.data?.me?.company?.name).toBeDefined();
    expect(result?.data?.me?.company?.type).toBeDefined();
    expect(result?.data?.me?.company?.employers).toHaveLength(2);
    expect(result?.data?.me?.company?.employers[0]?.firstName).toBeDefined();
    expect(result?.data?.me?.company?.employers[0]?.jobTitle).toBeDefined();
    expect(result?.data?.me?.company?.employers[0]?.lastName).toBeDefined();
  });
  afterAll(() => mesh?.destroy());
});
