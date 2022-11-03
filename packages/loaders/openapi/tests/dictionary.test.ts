import { GraphQLSchema } from 'graphql';
import { join } from 'path';
import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI';
import { printSchemaWithDirectives } from '@graphql-tools/utils';

describe('OpenAPI Loader: Cloudfunction', () => {
  let createdSchema: GraphQLSchema;

  beforeAll(async () => {
    createdSchema = await loadGraphQLSchemaFromOpenAPI('test', {
      source: join(__dirname, './fixtures/dictionary.json'),
    });
  });

  it('should generate correct schema', () => {
    expect(printSchemaWithDirectives(createdSchema)).toMatchSnapshot('cloudfunction-schema');
  });
});
