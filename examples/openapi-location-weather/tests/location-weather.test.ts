import { join } from 'path';
import { readFile } from 'fs-extra';
import { lexicographicSortSchema, printSchema } from 'graphql';
import { findAndParseConfig } from '@graphql-mesh/cli';
import { createMeshHTTPHandler, MeshHTTPHandler } from '@graphql-mesh/http';
import { getMesh, MeshInstance } from '@graphql-mesh/runtime';

describe('Location Weather', () => {
  jest.setTimeout(30000);
  let mesh: MeshInstance;
  let meshHTTP: ReturnType<typeof createMeshHTTPHandler>;
  beforeAll(async () => {
    const baseDir = join(__dirname, '..');
    const config = await findAndParseConfig({
      dir: baseDir,
    });
    mesh = await getMesh(config);
    meshHTTP = createMeshHTTPHandler({
      baseDir,
      getBuiltMesh: async () => mesh,
    });
  });
  it('should generate correct schema', async () => {
    expect(printSchema(lexicographicSortSchema(mesh.schema))).toMatchSnapshot(
      'location-weather-schema',
    );
  });
  it.skip('should give correct response for todayForecast', async () => {
    const todayForecastQuery = await readFile(join(__dirname, '../example-query.graphql'), 'utf8');
    const response = await meshHTTP.fetch('http://localhost:4000/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: todayForecastQuery,
      }),
    });
    const result = await response.json();
    expect(result?.errors?.[0]).toBeFalsy();
    expect(result?.data?.findCitiesUsingGET?.data?.length).toBeGreaterThan(0);
    const found = result.data.findCitiesUsingGET.data[0];
    expect(found.name).toBe('Istanbul');
    // expect(typeof found.todayForecast?.maxTemp).toBe('number');
    // expect(typeof found.todayForecast?.minTemp).toBe('number');
  });
  afterAll(() => {
    mesh?.destroy();
  });
});
