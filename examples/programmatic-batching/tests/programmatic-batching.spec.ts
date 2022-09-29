import { findAndParseConfig } from '@graphql-mesh/cli';
import { getMesh, MeshInstance } from '@graphql-mesh/runtime';
import { basename, join } from 'path';

import { lexicographicSortSchema } from 'graphql';
import { loadDocuments } from '@graphql-tools/load';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { createApp } from '../example-api/app';
import { createServer, Server } from 'http';
import { ProcessedConfig } from '@graphql-mesh/config';
import { readFile } from 'fs/promises';

describe('Batching Example', () => {
  let config: ProcessedConfig;
  let mesh: MeshInstance;
  beforeAll(async () => {
    config = await findAndParseConfig({
      dir: join(__dirname, '..'),
    });
    const app = createApp();
    config.logger = {
      info: () => {},
      error: () => {},
      warn: () => {},
      debug: () => {},
      log: () => {},
      child: () => config.logger,
    };
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
    const result = await mesh.execute(queryStr, {});
    expect(result).toMatchSnapshot('example-query-result');
    expect(config.fetchFn).toHaveBeenCalledTimes(1);
  });
});
