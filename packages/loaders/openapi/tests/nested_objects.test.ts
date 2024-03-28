import { execute, GraphQLSchema, parse, validate } from 'graphql';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI.js';
import { nestedObjectsApi } from './nested_objects_server.js';

describe('OpanAPI: nested objects', () => {
  /**
   * Set up the schema first and run example API server
   */
  let createdSchema: GraphQLSchema;
  beforeAll(async () => {
    // Update PORT for this test case:
    createdSchema = await loadGraphQLSchemaFromOpenAPI('example_api', {
      fetch: nestedObjectsApi.fetch as any,
      endpoint: `http://localhost:3000`,
      source: './fixtures/nested_object.json',
      cwd: __dirname,
      queryStringOptions: {
        // @ts-expect-error TODO: this is for what?
        allowDots: true,
      },
    });
  });

  it('should generate the schema correctly', () => {
    expect(printSchemaWithDirectives(createdSchema)).toMatchSnapshot();
  });

  it('Get response', async () => {
    const query = /* GraphQL */ `
      {
        searchCollection(
          collectionName: "CHECKOUT_SUPER_PRODUCT"
          searchParameters: { q: "water", query_by: "name" }
        ) {
          ... on SearchResult {
            hits {
              document
            }
          }
        }
      }
    `;

    const ast = parse(query);
    const errors = validate(createdSchema, ast);
    expect(errors).toEqual([]);

    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });

    expect(result).toEqual({
      data: {
        searchCollection: {
          hits: [
            {
              document: 'Something goes here',
            },
          ],
        },
      },
    });
  });
});
