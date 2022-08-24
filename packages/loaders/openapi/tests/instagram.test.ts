import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { fetch } from '@whatwg-node/fetch';
import { GraphQLSchema } from 'graphql/type';

import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI';

let createdSchema: GraphQLSchema;

describe('OpenAPI loader: instagram', () => {
  beforeAll(async () => {
    createdSchema = await loadGraphQLSchemaFromOpenAPI('example_api', {
      fetch,
      source: '../../../handlers/openapi/test/fixtures/instagram.json',
      cwd: __dirname,
    });
  });

  it('should generate the schema correctly', () => {
    expect(printSchemaWithDirectives(createdSchema)).toMatchSnapshot();
  });

  it('All Instagram query endpoints present', () => {
    const gqlTypes = Object.keys(createdSchema.getQueryType().getFields()).length;
    expect(gqlTypes).toEqual(22);
  });
});
