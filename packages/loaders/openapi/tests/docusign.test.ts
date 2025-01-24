import { GraphQLSchema } from 'graphql';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { fetch } from '@whatwg-node/fetch';
import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI.js';

describe('Docusign', () => {
  let createdSchema: GraphQLSchema;
  beforeAll(async () => {
    createdSchema = await loadGraphQLSchemaFromOpenAPI('test', {
      source: './fixtures/docusign.json',
      ignoreErrorResponses: true,
      cwd: __dirname,
      fetch,
      // It is not possible to provide a union type with File scalar
    });
  });
  it('should generate correct schema', () => {
    expect(printSchemaWithDirectives(createdSchema)).toMatchSnapshot('docusign-schema');
  });
});
