const { findAndParseConfig } = require('@graphql-mesh/cli');
const { getMesh } = require('@graphql-mesh/runtime');
const { join } = require('path');

const { GraphQLSchema } = require('graphql');

const config$ = findAndParseConfig({
  dir: join(__dirname, '..'),
});
const mesh$ = config$.then(config => getMesh(config));
jest.setTimeout(15000);

describe('Jira', () => {
  it('should generate correct schema', async () => {
    const { schema } = await mesh$;
    expect(schema instanceof GraphQLSchema).toBe(true);
  });
});
