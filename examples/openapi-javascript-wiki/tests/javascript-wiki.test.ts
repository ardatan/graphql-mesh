import { join } from 'path';
import { readFile } from 'fs-extra';
import { findAndParseConfig } from '@graphql-mesh/cli';
import { getMesh, MeshInstance } from '@graphql-mesh/runtime';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { Response } from '@whatwg-node/fetch';
import { ProcessedConfig } from '../../../packages/legacy/config/dist/typings/process';

jest.setTimeout(15000);

const wikipediaMetricsFixture = {
  items: [
    {
      views: 251269426,
    },
    {
      views: 268920258,
    },
    {
      views: 264139157,
    },
    {
      views: 263223806,
    },
    {
      views: 281644795,
    },
    {
      views: 288258779,
    },
    {
      views: 274868425,
    },
    {
      views: 265674834,
    },
    {
      views: 262894974,
    },
    {
      views: 257460877,
    },
    {
      views: 260429193,
    },
    {
      views: 278575834,
    },
    {
      views: 277540873,
    },
    {
      views: 271661525,
    },
    {
      views: 261316738,
    },
    {
      views: 262574894,
    },
    {
      views: 253126793,
    },
    {
      views: 255096104,
    },
    {
      views: 277613184,
    },
    {
      views: 281145569,
    },
    {
      views: 268440458,
    },
    {
      views: 263249933,
    },
    {
      views: 262433466,
    },
    {
      views: 257384061,
    },
    {
      views: 255541977,
    },
    {
      views: 278443117,
    },
    {
      views: 292464883,
    },
    {
      views: 270772229,
    },
    {
      views: 260524308,
    },
    {
      views: 257732732,
    },
    {
      views: 248206663,
    },
    {
      views: 244934940,
    },
    {
      views: 265318374,
    },
    {
      views: 276224331,
    },
    {
      views: 261069365,
    },
    {
      views: 262715392,
    },
    {
      views: 259931201,
    },
    {
      views: 247873441,
    },
    {
      views: 263134092,
    },
    {
      views: 278995396,
    },
    {
      views: 293768484,
    },
    {
      views: 267073808,
    },
    {
      views: 260339950,
    },
    {
      views: 258557598,
    },
    {
      views: 245577997,
    },
    {
      views: 256179598,
    },
    {
      views: 276950447,
    },
    {
      views: 274320398,
    },
    {
      views: 270860495,
    },
    {
      views: 265142387,
    },
    {
      views: 260041466,
    },
    {
      views: 247876009,
    },
    {
      views: 247227677,
    },
    {
      views: 267332134,
    },
    {
      views: 269889291,
    },
    {
      views: 261068472,
    },
    {
      views: 258661981,
    },
  ],
};

describe('JavaScript Wiki', () => {
  let config: ProcessedConfig;
  let mesh: MeshInstance;
  beforeAll(async () => {
    config = await findAndParseConfig({
      dir: join(__dirname, '..'),
    });
    const upstreamFetch = config.fetchFn;
    mesh = await getMesh({
      ...config,
      // Wikimedia intermittently blocks CI runners; keep this example deterministic.
      fetchFn: async (input, init) => {
        const url = String(typeof input === 'string' ? input : input.url);
        if (url.includes('/metrics/pageviews/aggregate/')) {
          if (url.includes('/20200101/') && url.includes('/20200226')) {
            return new Response(JSON.stringify(wikipediaMetricsFixture), {
              status: 200,
              headers: { 'content-type': 'application/json' },
            });
          }
          return new Response(
            JSON.stringify({
              items: [{ views: 1_000_000 }],
            }),
            {
              status: 200,
              headers: { 'content-type': 'application/json' },
            },
          );
        }
        return upstreamFetch(input, init);
      },
    });
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
