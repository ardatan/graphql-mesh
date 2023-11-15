import { readFile } from 'fs/promises';
import { join } from 'path';
import { GraphQLSchema } from 'graphql';
import { getComposedSchemaFromConfig } from '@graphql-mesh/compose-cli';
import { createServeRuntime } from '@graphql-mesh/serve-runtime';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { composeConfig, serveConfig } from '../mesh.config';

describe('JavaScript Wiki', () => {
  let supergraph: GraphQLSchema;
  let runtime;
  beforeAll(async () => {
    supergraph = await getComposedSchemaFromConfig({
      ...composeConfig,
      cwd: join(__dirname, '..'),
    });
    runtime = createServeRuntime({
      supergraph,
      maskedErrors: false,
      ...serveConfig,
    });
  });
  it('should generate correct schema', async () => {
    expect(printSchemaWithDirectives(supergraph)).toMatchSnapshot('javascript-wiki-schema');
  });
  it('should give correct response for viewsInPastMonth', async () => {
    const viewsInPastMonthQuery = await readFile(
      join(__dirname, '../example-queries/views-in-past-month.graphql'),
      'utf8',
    );
    const res = await runtime.fetch('/graphql', {
      method: 'POST',
      body: JSON.stringify({
        query: viewsInPastMonthQuery,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const result = await res.json();
    expect(result.errors).toBeFalsy();
    expect(result?.data?.viewsInPastMonth).toBeGreaterThan(0);
  });
  it('should give correct response for wikipediaMetrics within specific range', async () => {
    const wikipediaMetricsQuery = await readFile(
      join(__dirname, '../example-queries/wikipedia-metrics.graphql'),
      'utf8',
    );
    const res = await runtime.fetch('/graphql', {
      method: 'POST',
      body: JSON.stringify({
        query: wikipediaMetricsQuery,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const result = await res.json();
    expect(result).toMatchSnapshot('wikipedia-metrics-result');
  });
});
