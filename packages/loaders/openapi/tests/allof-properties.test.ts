import { GraphQLSchema } from 'graphql';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { fetch } from '@whatwg-node/fetch';
import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI.js';

describe('Merge attributes correctly in allOfs', () => {
  let createdSchema: GraphQLSchema;
  beforeAll(async () => {
    createdSchema = await loadGraphQLSchemaFromOpenAPI('test', {
      source: './fixtures/allof-properties.yml',
      cwd: __dirname,
      fetch,
      ignoreErrorResponses: true,
      // It is not possible to provide a union type with File scalar
    });
  });
  it('should generate correct schema', () => {
    expect(printSchemaWithDirectives(createdSchema)).toMatchSnapshot('allof-properties-schema');
  });
});
