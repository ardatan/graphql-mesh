import { readFileSync } from 'fs';
import { join } from 'path';
import { GraphQLSchema, lexicographicSortSchema, parse } from 'graphql';
import { getComposedSchemaFromConfig } from '@graphql-mesh/compose-cli';
import { getExecutorForSupergraph } from '@graphql-mesh/fusion-runtime';
import { Executor, printSchemaWithDirectives } from '@graphql-tools/utils';
import { composeConfig } from '../mesh.config';

describe('Neo4j', () => {
  let supergraph: GraphQLSchema;
  let executor: Executor;
  beforeAll(async () => {
    supergraph = await getComposedSchemaFromConfig(composeConfig);
    const { supergraphExecutor } = getExecutorForSupergraph({ supergraph });
    executor = supergraphExecutor;
  });
  jest.setTimeout(120_000);
  it('should generate correct schema', () => {
    expect(printSchemaWithDirectives(lexicographicSortSchema(supergraph))).toMatchSnapshot();
  });
  it('should give correct response for the example query', async () => {
    const query = readFileSync(join(__dirname, '../example-query.graphql'), 'utf8');
    const parsedDoc = parse(query);
    const res = await executor({
      document: parsedDoc,
      variables: {},
    });
    expect(res).toMatchSnapshot();
  });
});
