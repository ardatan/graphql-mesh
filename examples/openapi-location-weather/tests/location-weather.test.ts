import { findAndParseConfig } from '@graphql-mesh/config';
import { getMesh } from '@graphql-mesh/runtime';
import { basename, join } from 'path';

import { introspectionFromSchema, lexicographicSortSchema } from 'graphql';
import { readFile } from 'fs-extra';

describe('Location Weather', () => {
  const config$ = findAndParseConfig({
    dir: join(__dirname, '..'),
  });
  const mesh$ = config$.then(config => getMesh(config));
  it('should generate correct schema', async () => {
    const { schema } = await mesh$;
    expect(
      introspectionFromSchema(lexicographicSortSchema(schema), {
        descriptions: false,
      })
    ).toMatchSnapshot('location-weather-schema');
  });
  it('should give correct response for todayForecast', async () => {
    const todayForecastQuery = await readFile(join(__dirname, '../example-query.graphql'), 'utf8');
    const { execute } = await mesh$;
    const result = await execute(todayForecastQuery);
    expect(result.errors).toBeFalsy();
    expect(result?.data?.findCitiesUsingGET?.data?.length).toBe(1);
    const found = result.data.findCitiesUsingGET.data[0];
    expect(found.name).toBe('Istanbul');
    expect(typeof found.todayForecast?.maxTemp).toBe('number');
    expect(typeof found.todayForecast?.minTemp).toBe('number');
  });
  afterAll(() => mesh$.then(mesh => mesh.destroy()));
});
