import { graphql, GraphQLSchema } from 'graphql';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI.js';
import { exampleApi2 } from './example_api2_server.js';

/**
 * This test suite is used to verify the behavior of the naming convention
 *
 * It is necessary to make a separate OAS because we need all of operations to
 * have operationIDs.
 */
describe('OpenAPI loader: Naming convention', () => {
  /**
   * Set up the schema first and run example API server
   */
  let createdSchema: GraphQLSchema;
  beforeAll(async () => {
    createdSchema = await loadGraphQLSchemaFromOpenAPI('test', {
      fetch: exampleApi2.fetch,
      endpoint: 'http://localhost:{context.port}/api',
      source: './fixtures/example_oas2.json',
      cwd: __dirname,
    });
  });

  it('should generate the schema correctly', () => {
    expect(printSchemaWithDirectives(createdSchema)).toMatchSnapshot();
  });

  /**
   * There should be two operations.
   *
   * One will be given a field name from the operationId, i.e. User, and the other
   * one, because it does not have an operationId defined, will have a
   * name based on the path, i.e. user (Mind the casing)
   */
  it('Should allow both operations to be present', () => {
    const gqlTypes = Object.keys(createdSchema.getQueryType().getFields()).length;
    expect(gqlTypes).toEqual(2);
  });

  it('Querying the two operations', async () => {
    const query = /* GraphQL */ `
      query {
        user {
          name
        }
        User {
          name
        }
      }
    `;
    const result = await graphql({
      schema: createdSchema,
      source: query,
    });
    expect(result).toEqual({
      data: {
        user: {
          name: 'Arlene L McMahon',
        },
        User: {
          name: 'William B Ropp',
        },
      },
    });
  });
});
