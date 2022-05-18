const { findAndParseConfig } = require('@graphql-mesh/cli');
const { getMesh } = require('@graphql-mesh/runtime');
const { basename, join } = require('path');

const { introspectionFromSchema, printSchema, lexicographicSortSchema } = require('graphql');
const { loadDocuments } = require('@graphql-tools/load');
const { GraphQLFileLoader } = require('@graphql-tools/graphql-file-loader');

const config$ = findAndParseConfig({
  dir: join(__dirname, '..'),
});
const mesh$ = config$.then(config => getMesh(config));
jest.setTimeout(30000);

describe('Mongoose', () => {
  it('should generate correct schema', async () => {
    const { schema } = await mesh$;
    expect(printSchema(lexicographicSortSchema(schema))).toMatchSnapshot();
  });
  afterAll(() => mesh$.then(mesh => mesh.destroy()));
});
