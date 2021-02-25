const { findAndParseConfig } = require('@graphql-mesh/config');
const { getMesh } = require('@graphql-mesh/runtime');
const { readFile } = require('fs-extra');
const { join } = require('path');
const { printSchemaWithDirectives } = require('@graphql-tools/utils');

const mesh$ = findAndParseConfig({
  dir: join(__dirname, '..'),
}).then(config => getMesh(config));

describe('Hello World', () => {
  it('should generate correct schema', async () => {
    const { schema } = await mesh$;
    const printedSchema = printSchemaWithDirectives(schema);
    expect(printedSchema).toMatchSnapshot();
  });
  it('should give correct response', async () => {
    const { execute } = await mesh$;
    const result = await execute(/* GraphQL */ `
      query HelloWorld {
        greeting
      }
    `);
    expect(result).toMatchSnapshot();
  });
  afterAll(() => mesh$.then(mesh => mesh.destroy()));
});
