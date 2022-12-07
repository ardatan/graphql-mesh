const { findAndParseConfig } = require('@graphql-mesh/cli');
const { getMesh } = require('@graphql-mesh/runtime');
const { join } = require('path');

const { printSchemaWithDirectives } = require('@graphql-tools/utils');
const { readFile } = require('fs-extra');

const config$ = findAndParseConfig({
  dir: join(__dirname, '..'),
});
const mesh$ = config$.then(config => getMesh(config));
jest.setTimeout(15000);

describe('JavaScript Wiki', () => {
  it('should generate correct schema', async () => {
    const { schema } = await mesh$;
    expect(printSchemaWithDirectives(schema)).toMatchSnapshot('javascript-wiki-schema');
  });
  it('should give correct response for viewsInPastMonth', async () => {
    const viewsInPastMonthQuery = await readFile(
      join(__dirname, '../example-queries/views-in-past-month.graphql'),
      'utf8',
    );
    const { execute } = await mesh$;
    const result = await execute(viewsInPastMonthQuery);
    expect(result.errors).toBeFalsy();
    expect(result?.data?.viewsInPastMonth).toBeGreaterThan(0);
  });
  it('should give correct response for wikipediaMetrics within specific range', async () => {
    const wikipediaMetricsQuery = await readFile(
      join(__dirname, '../example-queries/wikipedia-metrics.graphql'),
      'utf8',
    );
    const { execute } = await mesh$;
    const result = await execute(wikipediaMetricsQuery);
    expect(result).toMatchSnapshot('wikipedia-metrics-result');
  });
});
