const { findAndParseConfig } = require('@graphql-mesh/config');
const { getMesh } = require('@graphql-mesh/runtime');
const { basename, join } = require('path');

const { introspectionFromSchema, lexicographicSortSchema } = require('graphql');

describe.skip('MySQL Rfam', () => {
  jest.setTimeout(30000);
  let config$, mesh$;
  beforeAll(() => {
    config$ = findAndParseConfig({
      dir: join(__dirname, '..'),
    });
    config$.then(config => getMesh(config));
  })
  it('should generate correct schema', async () => {
    const { schema } = await mesh$;
    expect(
      introspectionFromSchema(lexicographicSortSchema(schema), {
        descriptions: false,
      })
    ).toMatchSnapshot('mysql-rfam-schema');
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
