import { join } from 'path';
import { findAndParseConfig } from '@graphql-mesh/cli';
import { getMesh, type MeshInstance } from '@graphql-mesh/runtime';
import { printSchemaWithDirectives } from '@graphql-tools/utils';

describe('OpenAPI filter + extend', () => {
  let mesh: MeshInstance;

  beforeAll(async () => {
    const config = await findAndParseConfig({
      dir: join(__dirname, '..'),
    });
    mesh = await getMesh(config);
  }, 30000);

  afterAll(() => mesh?.destroy());

  it('builds a schema without Mutation and with the extended Pet field', () => {
    expect(mesh.schema.getMutationType()).toBeUndefined();
    expect(mesh.schema.getType('Pet')).toBeDefined();
    expect((mesh.schema.getType('Pet') as any).getFields().fullName).toBeDefined();
    expect(() => printSchemaWithDirectives(mesh.schema)).not.toThrow();
    expect(printSchemaWithDirectives(mesh.schema)).toContain('fullName');
  });
});
