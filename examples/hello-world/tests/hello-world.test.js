const { findAndParseConfig } = require('@graphql-mesh/cli');
const { getMesh } = require('@graphql-mesh/runtime');
const { join } = require('path');

const { printSchemaWithDirectives } = require('@graphql-tools/utils');

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
    const result = await execute(/* GraphQL */ `
      query HelloWorld {
        greeting
      }
    `);
    expect(result?.errors).toBeFalsy();
    expect(result).toMatchSnapshot();
  });
  afterAll(() => mesh$.then(mesh => mesh.destroy()));
});
