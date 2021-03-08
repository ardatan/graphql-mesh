const { findAndParseConfig } = require('@graphql-mesh/config');
const { getMesh } = require('@graphql-mesh/runtime');
const { basename, join } = require('path');

const { introspectionFromSchema, lexicographicSortSchema } = require('graphql');
const { readFile } = require('fs-extra');

const config$ = findAndParseConfig({
  dir: join(__dirname, '..'),
});
const mesh$ = config$.then(config => getMesh(config));
jest.setTimeout(15000);

describe('JavaScript Wiki', () => {
  it('should generate correct schema', async () => {
    const { schema } = await mesh$;
    expect(
      introspectionFromSchema(lexicographicSortSchema(schema), {
        descriptions: false,
      })
    ).toMatchSnapshot('javascript-wiki-schema');
  });
  it('should give correct response for viewsInPastMonth', async () => {
    const {
      config: {
        serve: { exampleQuery },
      },
    } = await config$;
    const viewsInPastMonthQuery = await readFile(join(__dirname, '../example-queries/views-in-past-month.graphql'), 'utf8');
    const { execute } = await mesh$;
    const result = await execute(viewsInPastMonthQuery);
    expect(typeof result?.data?.viewsInPastMonth).toBe('number');
  });
  it('should give correct response for wikipediaMetrics within specific range', async () => {
    const {
      config: {
        serve: { exampleQuery },
      },
    } = await config$;
    const wikipediaMetricsQuery = await readFile(
      join(__dirname, '../example-queries/wikipedia-metrics.graphql'),
      'utf8'
    );
    const { execute } = await mesh$;
    const result = await execute(wikipediaMetricsQuery);
    expect(result).toMatchSnapshot('wikipedia-metrics-result');
  });
  afterAll(() => mesh$.then(mesh => mesh.destroy()));
});
