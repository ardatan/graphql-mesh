const { findAndParseConfig } = require('@graphql-mesh/config');
const { getMesh } = require('@graphql-mesh/runtime');
const { join } = require('path');
const { introspectionFromSchema, lexicographicSortSchema } = require('graphql');
const { loadDocuments } = require('@graphql-tools/load');
const { GraphQLFileLoader } = require('@graphql-tools/graphql-file-loader');

const config$ = findAndParseConfig({
  dir: join(__dirname, '..'),
});
const mesh$ = config$.then(config => getMesh(config));
jest.setTimeout(30000);

describe('JSON Schema FHIR', () => {
  it('should generate correct schema', async () => {
    const { schema } = await mesh$;
    expect(
      introspectionFromSchema(lexicographicSortSchema(schema), {
        descriptions: false,
      })
    ).toMatchSnapshot('fhir-schema');
  });
  it('should give correct response for example queries', async () => {
    const {
      config: {
        serve: { exampleQuery },
      },
    } = await config$;
    const sources = await loadDocuments(join(__dirname, '..', exampleQuery), {
      loaders: [new GraphQLFileLoader()],
    });
    const { execute } = await mesh$;
    for (const source of sources) {
      const result = await execute(source.document);
      expect(result).toMatchSnapshot(source.location + '-fhir-example-result');
    }
  });
  afterAll(() => mesh$.then(mesh => mesh.destroy()));
});
