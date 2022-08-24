import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { fetch } from '@whatwg-node/fetch';
import { GraphQLSchema, parse, validate, execute } from 'graphql';
import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI';

import { startServer, stopServer } from '../../../handlers/openapi/test/nested_objects_server';

let createdSchema: GraphQLSchema;
const PORT = 3009;
// Update PORT for this test case:
const baseUrl = `http://localhost:${PORT}`;

describe('OpanAPI: nested objects', () => {
  /**
   * Set up the schema first and run example API server
   */
  beforeAll(async () => {
    createdSchema = await loadGraphQLSchemaFromOpenAPI('example_api', {
      fetch,
      baseUrl,
      source: '../../../handlers/openapi/test/fixtures/nested_object.json',
      cwd: __dirname,
      queryStringOptions: {
        allowDots: true,
      },
    });
    await startServer(PORT);
  });

  /**
   * Shut down API server
   */
  afterAll(() => stopServer());

  it('should generate the schema correctly', () => {
    expect(printSchemaWithDirectives(createdSchema)).toMatchSnapshot();
  });

  it('Get response', async () => {
    const query = /* GraphQL */ `
      {
        searchCollection(collectionName: "CHECKOUT_SUPER_PRODUCT", searchParameters: { q: "water", query_by: "name" }) {
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
