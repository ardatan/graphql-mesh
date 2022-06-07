const { findAndParseConfig } = require('@graphql-mesh/cli');
const { getMesh } = require('@graphql-mesh/runtime');
const { basename, join } = require('path');

const { introspectionFromSchema, lexicographicSortSchema } = require('graphql');
const { readFile } = require('fs-extra');

const config$ = findAndParseConfig({
  dir: join(__dirname, '..'),
});
const mesh$ = config$.then(config => getMesh(config));
jest.setTimeout(30000);

describe('Location Weather', () => {
  it('should generate correct schema', async () => {
    const { schema } = await mesh$;
    expect(
      introspectionFromSchema(lexicographicSortSchema(schema), {
        descriptions: false,
      })
    ).toMatchSnapshot('location-weather-schema');
  });
  it.skip('should give correct response for todayForecast', async () => {
    const todayForecastQuery = await readFile(join(__dirname, '../example-query.graphql'), 'utf8');
    const { execute } = await mesh$;
    const result = await execute(todayForecastQuery);
    console.log(result.errors[0]);
    expect(result.errors).toBeFalsy();
    expect(result?.data?.findCitiesUsingGET?.data?.length).toBeGreaterThan(0);
    const found = result.data.findCitiesUsingGET.data[0];
    expect(found.name).toBe('Istanbul');
    // expect(typeof found.todayForecast?.maxTemp).toBe('number');
    // expect(typeof found.todayForecast?.minTemp).toBe('number');
  });
  afterAll(() => mesh$.then(mesh => mesh.destroy()));
});
