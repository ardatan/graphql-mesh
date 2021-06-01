const { findAndParseConfig } = require('@graphql-mesh/config');
const { getMesh } = require('@graphql-mesh/runtime');
const { basename, join } = require('path');

const { introspectionFromSchema, lexicographicSortSchema } = require('graphql');
const { MeshStore, InMemoryStoreStorageAdapter } = require('@graphql-mesh/store');

const store = new MeshStore('soap', new InMemoryStoreStorageAdapter(), {
  readonly: false,
  validate: false,
});

const config$ = findAndParseConfig({
  dir: join(__dirname, '..'),
  store,
});
const mesh$ = config$.then(config => getMesh(config));
jest.setTimeout(30000);

describe('SOAP Country Info', () => {
  it('should generate correct schema', async () => {
    const { schema } = await mesh$;
    expect(
      introspectionFromSchema(lexicographicSortSchema(schema), {
        descriptions: false,
      })
    ).toMatchSnapshot('soap-country-info-schema');
  });
  it('should give correct response for example queries', async () => {
    const { documents } = await config$;
    const { execute } = await mesh$;
    for (const source of documents) {
      const result = await execute(source.document);
      expect(result).toMatchSnapshot(basename(source.location) + '-soap-country-info-result');
    }
  });
  afterAll(() => mesh$.then(mesh => mesh.destroy()));
});
