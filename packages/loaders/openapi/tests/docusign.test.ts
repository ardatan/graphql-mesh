import { GraphQLSchema } from 'graphql';
import { join } from 'path';
import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI';
import { printSchemaWithDirectives } from '@graphql-tools/utils';

describe('Docusign', () => {
  let createdSchema: GraphQLSchema;
  beforeAll(async () => {
    createdSchema = await loadGraphQLSchemaFromOpenAPI('test', {
      oasFilePath: join(__dirname, '../../../handlers/openapi/test/fixtures/docusign.json'),
      ignoreErrorResponses: true,
      // It is not possible to provide a union type with File scalar
    });
  });
  it('should generate correct schema', () => {
    expect(printSchemaWithDirectives(createdSchema)).toMatchSnapshot('docusign-schema');
  });
});
