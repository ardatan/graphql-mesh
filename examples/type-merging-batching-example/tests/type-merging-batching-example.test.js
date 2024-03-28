const { findAndParseConfig } = require('@graphql-mesh/cli');
const { getMesh } = require('@graphql-mesh/runtime');
const { basename, join } = require('path');

const { lexicographicSortSchema } = require('graphql');
const { loadDocuments } = require('@graphql-tools/load');
const { GraphQLFileLoader } = require('@graphql-tools/graphql-file-loader');
const { printSchemaWithDirectives } = require('@graphql-tools/utils');

jest.setTimeout(30000);

describe('Type Merging and Batching Example', () => {
  let config;
  let mesh;
  const debugVar = globalThis.process?.env?.DEBUG;
  beforeAll(async () => {
    globalThis.process.env.DEBUG = '1';
    config = await findAndParseConfig({
      dir: join(__dirname, '..'),
    });
    mesh = await getMesh(config);
  });
  afterAll(() => {
    globalThis.process.env.DEBUG = debugVar;
    mesh?.destroy?.();
  });
  it('should generate correct schema', async () => {
    expect(printSchemaWithDirectives(lexicographicSortSchema(mesh.schema))).toMatchSnapshot();
  });
  it('should give correct response for example queries', async () => {
    for (const source of config.documents) {
      const result = await mesh.execute(source.document);
      expect(result.extensions?.jit).toBeUndefined();
      expect(result).toMatchSnapshot(basename(source.location) + '-query-result');
    }
  });
  it('should give correct response for example queries with JIT', async () => {
    mesh = await getMesh({
      ...config,
      jitEnabled: true,
    });
    for (const source of config.documents) {
      const result = await mesh.execute(source.document);
      expect(result.extensions?.jit).toBe(true);
      expect(result).toMatchSnapshot(basename(source.location) + '-query-result');
    }
  });
});
