/* eslint-disable import/no-nodejs-modules */
import { execute, GraphQLSchema, parse } from 'graphql';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI.js';
import { exampleApi8 } from './example_api8_server.js';

let createdSchema: GraphQLSchema;

/**
 * This test suite is used to verify the behavior of the upstream api returning an empty 404 response
 */
describe('OpenAPI loader: Empty upstream 404 response', () => {
  beforeAll(async () => {
    createdSchema = await loadGraphQLSchemaFromOpenAPI('test', {
      fetch: exampleApi8.fetch as any,
      endpoint: 'http://localhost:{context.port}/api',
      source: './fixtures/example_oas8.json',
      cwd: __dirname,
    });
  });

  it('should generate the schema correctly', () => {
    expect(printSchemaWithDirectives(createdSchema)).toMatchSnapshot();
  });

  it('Querying the operation', async () => {
    const query = /* GraphQL */ `
      query {
        user {
          name
        }
      }
    `;
    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });
    expect(result).toMatchInlineSnapshot(`
      {
        "data": {
          "user": null,
        },
        "errors": [
          [GraphQLError: Upstream HTTP Error: 404, Could not invoke operation GET /user],
        ],
      }
    `);
  });
});
