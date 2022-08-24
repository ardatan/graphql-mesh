import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { fetch } from '@whatwg-node/fetch';
import { GraphQLSchema } from 'graphql';

import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI';

let createdSchema: GraphQLSchema;

describe('example_api', () => {
  /**
   * Set up the schema first
   */
  beforeAll(async () => {
    // const validOas = await getValidOAS3(oas);
    createdSchema = await loadGraphQLSchemaFromOpenAPI('example_api', {
      fetch,
      source: './fixtures/weather_underground.json',
      cwd: __dirname,
    });
  });

  it('should generate the schema correctly', () => {
    expect(printSchemaWithDirectives(createdSchema)).toMatchSnapshot();
  });

  it('All Weather Underground query endpoints present', () => {
    const gqlTypes = Object.keys(createdSchema.getQueryType().getFields()).length;
    expect(gqlTypes).toEqual(3);
  });
});
