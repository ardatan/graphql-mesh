const { findAndParseConfig } = require('@graphql-mesh/cli');
const { getMesh } = require('@graphql-mesh/runtime');
const { join } = require('path');

const { printSchemaWithDirectives } = require('@graphql-tools/utils');

const config$ = findAndParseConfig({
  dir: join(__dirname, '..'),
});
const mesh$ = config$.then(config => getMesh(config));
jest.setTimeout(15000);

describe('Orbit', () => {
  it('should generate correct schema', async () => {
    const { schema } = await mesh$;
    expect(printSchemaWithDirectives(schema)).toMatchSnapshot();
  });
});
