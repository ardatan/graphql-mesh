import { readFileSync } from 'fs';
import { join } from 'path';
import { GraphQLSchema, lexicographicSortSchema, parse } from 'graphql';
import { getComposedSchemaFromConfig } from '@graphql-mesh/compose-cli';
import { getExecutorForFusiongraph } from '@graphql-mesh/fusion-runtime';
import { PubSub } from '@graphql-mesh/utils';
import { Executor, printSchemaWithDirectives } from '@graphql-tools/utils';
import { composeConfig } from '../mesh.config';

describe('Neo4j', () => {
  let fusiongraph: GraphQLSchema;
  let executor: Executor;
  const pubsub = new PubSub();
  beforeAll(async () => {
    fusiongraph = await getComposedSchemaFromConfig(composeConfig);
    const { fusiongraphExecutor } = getExecutorForFusiongraph({ fusiongraph, pubsub });
    executor = fusiongraphExecutor;
  });
  jest.setTimeout(120_000);
  it('should generate correct schema', () => {
    expect(printSchemaWithDirectives(lexicographicSortSchema(fusiongraph))).toMatchSnapshot();
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
  afterAll(() => {
    pubsub.publish('destroy', undefined);
  });
});
