const { join } = require('path');
const { findAndParseConfig } = require('@graphql-mesh/cli');
const { getMesh } = require('@graphql-mesh/runtime');

const { introspectionFromSchema, lexicographicSortSchema } = require('graphql');

const mesh$ = findAndParseConfig({
  dir: join(__dirname, '..'),
}).then(config => getMesh(config));

describe('GraphQL WebSocket only', () => {
  it('should generate correct schema', async () => {
    const { schema } = await mesh$;
    expect(
      introspectionFromSchema(lexicographicSortSchema(schema), {
        descriptions: false,
      })
    ).toMatchSnapshot();
  });
});
