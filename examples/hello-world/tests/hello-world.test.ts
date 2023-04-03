import { join } from 'path';
import { findAndParseConfig } from '@graphql-mesh/cli';
import { getMesh } from '@graphql-mesh/runtime';
import { printSchemaWithDirectives } from '@graphql-tools/utils';

const mesh$ = findAndParseConfig({
  dir: join(__dirname, '..'),
}).then(config => getMesh(config));

describe('Hello World', () => {
  it('should generate correct schema', async () => {
    const { schema } = await mesh$;
    expect(printSchemaWithDirectives(schema)).toMatchSnapshot();
  });
  it('should give correct response', async () => {
    const { execute } = await mesh$;
    const result = await execute(
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
  afterAll(() => mesh$.then(mesh => mesh.destroy()));
});
