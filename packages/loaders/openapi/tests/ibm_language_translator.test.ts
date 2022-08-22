import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { fetch } from '@whatwg-node/fetch';
import { GraphQLSchema } from 'graphql';

import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI';

let createdSchema: GraphQLSchema;

describe('OpenAPI loader: IBM language translator', () => {
  /**
   * Set up the schema first
   */
  beforeAll(async () => {
    createdSchema = await loadGraphQLSchemaFromOpenAPI('example_api', {
      fetch,
      oasFilePath: '../../../handlers/openapi/test/fixtures/ibm_language_translator.json',
      cwd: __dirname,
    });
  });

  it('should generate the schema correctly', () => {
    expect(printSchemaWithDirectives(createdSchema)).toMatchSnapshot();
  });

  it('All IBM Language Translator query endpoints present', () => {
    const gqlTypes = Object.keys(createdSchema.getQueryType().getFields()).length;

    expect(gqlTypes).toEqual(5);
  });
});
