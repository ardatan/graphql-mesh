import { readFile } from 'fs/promises';
import { join } from 'path';
import { lexicographicSortSchema } from 'graphql';
import { findAndParseConfig } from '@graphql-mesh/cli';
import { ProcessedConfig } from '@graphql-mesh/config';
import { getMesh, MeshInstance } from '@graphql-mesh/runtime';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { dummyLogger } from '../../../packages/testing/dummyLogger';
import { createApp } from '../example-api/app';

describe('Batching Example', () => {
  let config: ProcessedConfig;
  let mesh: MeshInstance;
  beforeAll(async () => {
    config = await findAndParseConfig({
      dir: join(__dirname, '..'),
    });
    const app = createApp();
    config.logger = dummyLogger;
    config.fetchFn = jest.fn(async (url, options) => app.fetch(url, options));
    mesh = await getMesh(config);
  });
  afterAll(() => {
    mesh.destroy();
  });
  it('should generate correct schema', () => {
    expect(printSchemaWithDirectives(lexicographicSortSchema(mesh.schema))).toMatchSnapshot();
  });
  it('should give correct response for the batched example query', async () => {
    const queryStr = await readFile(join(__dirname, '..', 'example-query.graphql'), 'utf-8');
    const result = await mesh.execute(queryStr);
    expect(result).toMatchSnapshot('example-query-result');
    expect(config.fetchFn).toHaveBeenCalledTimes(2);
  });
});
