const { findAndParseConfig } = require('@graphql-mesh/cli');
const { getMesh } = require('@graphql-mesh/runtime');
const { basename, join } = require('path');

const { printSchema, lexicographicSortSchema } = require('graphql');

describe.skip('Neo4j', () => {
  let config$, mesh$;
  beforeAll(() => {
    config$ = findAndParseConfig({
      dir: join(__dirname, '..'),
    });
    mesh$ = config$.then(config => getMesh(config));
  })
  jest.setTimeout(30000);
  it('should generate correct schema', async () => {
    const { schema } = await mesh$;
    expect(printSchema(lexicographicSortSchema(schema))).toMatchSnapshot();
  });
  it('should give correct response for example queries', async () => {
    const { documents } = await config$;
    const { execute } = await mesh$;
    for (const source of documents) {
      const result = await execute(source.document);
      expect(result).toMatchSnapshot(basename(source.location) + '-query-result');
    }
  });
  afterAll(() => mesh$.then(mesh => mesh.destroy()));
});
