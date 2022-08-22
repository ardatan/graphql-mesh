import { graphql, GraphQLSchema } from 'graphql';

import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI';
import { startServer, stopServer } from '../../../handlers/openapi/test/example_api2_server';
import { fetch } from '@whatwg-node/fetch';
import { printSchemaWithDirectives } from '@graphql-tools/utils';

let createdSchema: GraphQLSchema;
const PORT = 3004;
const baseUrl = `http://localhost:${PORT}/api`;

/**
 * This test suite is used to verify the behavior of the naming convention
 *
 * It is necessary to make a separate OAS because we need all of operations to
 * have operationIDs.
 */
describe('example_api2', () => {
  /**
   * Set up the schema first and run example API server
   */
  beforeAll(async () => {
    createdSchema = await loadGraphQLSchemaFromOpenAPI('test', {
      fetch,
      baseUrl,
      oasFilePath: '../../../handlers/openapi/test/fixtures/example_oas2.json',
      cwd: __dirname,
    });
    await startServer(PORT);
  });

  /**
   * Shut down API server
   */
  afterAll(() => {
    return stopServer();
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

  it('Querying the two operations', () => {
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
    return graphql({ schema: createdSchema, source: query }).then((result: any) => {
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
});
