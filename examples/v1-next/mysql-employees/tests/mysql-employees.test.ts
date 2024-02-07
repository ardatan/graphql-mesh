import { readFileSync } from 'fs';
import { basename, join } from 'path';
import { GraphQLSchema, parse } from 'graphql';
import { findAndParseConfig } from '@graphql-mesh/cli';
import { getComposedSchemaFromConfig } from '@graphql-mesh/compose-cli';
import { ProcessedConfig } from '@graphql-mesh/config';
import { getExecutorForFusiongraph } from '@graphql-mesh/fusion-runtime';
import { getMesh, MeshInstance } from '@graphql-mesh/runtime';
import { PubSub } from '@graphql-mesh/utils';
import { Executor, printSchemaWithDirectives } from '@graphql-tools/utils';
import { getMySQLExecutor } from '@omnigraph/mysql';
import { composeConfig } from '../mesh.config';

jest.setTimeout(30000);

describe('MySQL Employees', () => {
  let fusiongraph: GraphQLSchema;
  let executor: Executor;
  const pubsub = new PubSub();
  beforeAll(async () => {
    fusiongraph = await getComposedSchemaFromConfig(composeConfig);
    const { fusiongraphExecutor } = getExecutorForFusiongraph({ fusiongraph });
    executor = fusiongraphExecutor;
  });
  it('should generate correct schema', async () => {
    expect(printSchemaWithDirectives(fusiongraph)).toMatchSnapshot('schema');
  });
  it('should give correct response for the example query', async () => {
    const exampleQuery = readFileSync(join(__dirname, '../example-query.graphql'), 'utf8');
    const parsedDoc = parse(exampleQuery);
    const res = await executor({
      document: parsedDoc,
      variables: {},
    });
    expect(res).toMatchSnapshot('example-query.graphql-query-result');
  });
  afterAll(() => {
    pubsub.publish('destroy', undefined);
  });
});
