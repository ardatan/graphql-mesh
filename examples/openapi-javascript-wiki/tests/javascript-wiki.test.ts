import { join } from 'path';
import { readFile } from 'fs-extra';
import { findAndParseConfig } from '@graphql-mesh/cli';
import { getMesh, MeshInstance } from '@graphql-mesh/runtime';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { ProcessedConfig } from '../../../packages/legacy/config/dist/typings/process';

jest.setTimeout(15000);

describe('JavaScript Wiki', () => {
  let config: ProcessedConfig;
  let mesh: MeshInstance;
  beforeAll(async () => {
    config = await findAndParseConfig({
      dir: join(__dirname, '..'),
    });
    mesh = await getMesh(config);
  });
  it('should generate correct schema', async () => {
    expect(printSchemaWithDirectives(mesh.schema)).toMatchSnapshot('javascript-wiki-schema');
  });
  it('should give correct response for viewsInPastMonth', async () => {
    const viewsInPastMonthQuery = await readFile(
      join(__dirname, '../example-queries/views-in-past-month.graphql'),
      'utf8',
    );
    const result = await mesh.execute(viewsInPastMonthQuery);
    expect(result.errors).toBeFalsy();
    expect(result?.data?.viewsInPastMonth).toBeGreaterThan(0);
  });
  it('should give correct response for wikipediaMetrics within specific range', async () => {
    const wikipediaMetricsQuery = await readFile(
      join(__dirname, '../example-queries/wikipedia-metrics.graphql'),
      'utf8',
    );
    const result = await mesh.execute(wikipediaMetricsQuery);
    expect(result).toMatchSnapshot('wikipedia-metrics-result');
  });
  afterAll(() => mesh?.destroy());
});
