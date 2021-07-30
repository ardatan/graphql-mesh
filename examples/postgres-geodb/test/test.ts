const { findAndParseConfig } = require('@graphql-mesh/config');
const { getMesh } = require('@graphql-mesh/runtime');
const { basename, join } = require('path');

const { printSchema, lexicographicSortSchema } = require('graphql');

const config$ = findAndParseConfig({
  dir: join(__dirname, '..'),
});
const mesh$ = config$.then(config => getMesh(config));
jest.setTimeout(30000);

describe('PostgresGeoDB', () => {
  it('should give correct response for example queries', async () => {
    const { documents } = await config$;
    const { execute } = await mesh$;
    const result = await execute(documents[0].document);
    expect(result?.data?.allCities?.nodes?.[0]?.countrycode).toBeTruthy();
    expect(result?.data?.allCities?.nodes?.[0]?.developers?.[0]?.login).toBeTruthy();
  });
  afterAll(() => mesh$.then(mesh => mesh.destroy()));
});
