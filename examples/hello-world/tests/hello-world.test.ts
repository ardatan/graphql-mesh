import { join } from 'path';
import { findAndParseConfig } from '@graphql-mesh/cli';
import { getMesh, MeshInstance } from '@graphql-mesh/runtime';
import { printSchemaWithDirectives } from '@graphql-tools/utils';

describe('Hello World', () => {
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
    const result = await mesh.execute(
      /* GraphQL */ `
        query HelloWorld {
          greeting
        }
      `,
      undefined,
    );
    expect(result?.errors).toBeFalsy();
    expect(result).toMatchSnapshot();
  });
  afterAll(() => mesh?.destroy());
});
