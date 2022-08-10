const { join } = require('path');

const { start: startEndpoint } = require('../endpoint');

const { findAndParseConfig } = require('@graphql-mesh/cli');
const { getMesh } = require('@graphql-mesh/runtime');

const { introspectionFromSchema, lexicographicSortSchema } = require('graphql');

let mesh$ = {},
  stopEndpoint = () => {};
beforeAll(async () => {
  stopEndpoint = await startEndpoint();

  mesh$ = await getMesh(
    await findAndParseConfig({
      dir: join(__dirname, '..'),
    })
  );
});
afterAll(async () => {
  await stopEndpoint();
});

describe('GraphQL WebSocket only', () => {
  it('should generate correct schema', () => {
    const { schema } = mesh$;
    expect(
      introspectionFromSchema(lexicographicSortSchema(schema), {
        descriptions: false,
      })
    ).toMatchSnapshot();
  });
});
