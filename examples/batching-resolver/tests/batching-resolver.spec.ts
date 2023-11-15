import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { GraphQLSchema, parse } from 'graphql';
import { getComposedSchemaFromConfig } from '@graphql-mesh/compose-cli';
import { getExecutorForSupergraph } from '@graphql-mesh/fusion-runtime';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { createApp } from '../example-api/app';
import { composeConfig } from '../mesh.config';

describe('Batching Resolvers Example', () => {
  const exampleApi = createApp();
  let supergraph: GraphQLSchema;
  beforeAll(async () => {
    supergraph = await getComposedSchemaFromConfig({
      ...composeConfig,
      fetch: exampleApi.fetch as any,
      cwd: join(__dirname, '..'),
    });
  });
  it('generates the schema correctly', () => {
    expect(printSchemaWithDirectives(supergraph)).toMatchSnapshot('schema');
  });
  const queryNames = readdirSync(join(__dirname, '../example-queries'));
  for (const queryName of queryNames) {
    it(`executes ${queryName} query`, async () => {
      const { supergraphExecutor } = getExecutorForSupergraph({
        supergraph,
      });
      const query = readFileSync(join(__dirname, '../example-queries', queryName), 'utf8');
      const result = await supergraphExecutor({
        document: parse(query),
        context: {
          fetch: exampleApi.fetch,
        },
      });
      expect(result).toMatchSnapshot(queryName);
    });
  }
});
