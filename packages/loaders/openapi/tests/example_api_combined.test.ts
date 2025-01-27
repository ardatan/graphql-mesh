/* eslint-disable import/no-nodejs-modules */
import { execute, GraphQLSchema, parse } from 'graphql';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI.js';
import { exampleApi } from './example_api_server.js';

describe('Example API Combined', () => {
  let createdSchema: GraphQLSchema;
  beforeAll(async () => {
    createdSchema = await loadGraphQLSchemaFromOpenAPI('example_api_combined', {
      source: './fixtures/example_oas_combined.json',
      cwd: __dirname,
      endpoint: 'http://localhost:3000/api',
      fetch: exampleApi.fetch,
    });
  });

  it('should generate correct schema', () => {
    expect(printSchemaWithDirectives(createdSchema)).toMatchSnapshot('example_oas_combined-schema');
  });

  it('should handle allOf correctly', async () => {
    const query = /* GraphQL */ `
      query {
        getAllCars {
          model
        }
      }
    `;

    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });

    expect(result).toMatchSnapshot('example_oas_combined-query-result');
  });
});
