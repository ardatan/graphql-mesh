import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { GraphQLSchema, parse } from 'graphql';
import { getComposedSchemaFromConfig } from '@graphql-mesh/compose-cli';
import { getExecutorForSupergraph } from '@graphql-mesh/fusion-runtime';
import { Executor, printSchemaWithDirectives } from '@graphql-tools/utils';
import { composeConfig } from '../mesh.config';

describe('SOAP Country Info', () => {
  let supergraph: GraphQLSchema;
  let executor: Executor;
  beforeAll(async () => {
    supergraph = await getComposedSchemaFromConfig({
      ...composeConfig,
      cwd: join(__dirname, '..'),
    });
    ({ supergraphExecutor: executor } = getExecutorForSupergraph({ supergraph }));
  });
  it('generates the schema correctly', () => {
    expect(printSchemaWithDirectives(supergraph)).toMatchSnapshot('schema');
  });
  const queryNames = readdirSync(join(__dirname, '../example-queries'));
  for (const queryName of queryNames) {
    it(`executes ${queryName} query`, async () => {
      const query = readFileSync(join(__dirname, '../example-queries', queryName), 'utf8');
      const result = await executor({
        document: parse(query),
      });
      expect(result).toMatchSnapshot(queryName);
    });
  }
});
