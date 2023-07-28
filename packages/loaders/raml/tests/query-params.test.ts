import { GraphQLSchema } from 'graphql';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { loadGraphQLSchemaFromRAML } from '../src/loadGraphQLSchemaFromRAML';

describe('Query Paramters', () => {
  let schema: GraphQLSchema;
  beforeAll(async () => {
    schema = await loadGraphQLSchemaFromRAML('query-params', {
      source: './fixtures/query-params.raml',
      cwd: __dirname,
    });
  });
  it('generates correct schema', () => {
    expect(printSchemaWithDirectives(schema)).toMatchSnapshot();
  });
});
