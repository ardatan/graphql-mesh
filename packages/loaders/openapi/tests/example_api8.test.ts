import { graphql, GraphQLSchema } from 'graphql';

import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI';
import { startServer, stopServer } from './example_api8_server';
import { fetch } from '@whatwg-node/fetch';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import getPort from 'get-port';

let createdSchema: GraphQLSchema;

/**
 * This test suite is used to verify the behavior of the upstream api returning an empty 404 response
 */
describe('OpenAPI loader: Empty upstream 404 response', () => {
  /**
   * Set up the schema first and run example API server
   */
  beforeAll(async () => {
    const PORT = await getPort();
    const baseUrl = `http://localhost:${PORT}/api`;
    createdSchema = await loadGraphQLSchemaFromOpenAPI('test', {
      fetch,
      baseUrl,
      source: './fixtures/example_oas8.json',
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

  it('Querying the operation', () => {
    const query = /* GraphQL */ `
      query {
        user {
          name
        }
      }
    `;
    return graphql({ schema: createdSchema, source: query }).then((result: any) => {
      expect(result).toEqual({
        data: {
          user: null,
        },
      });
    });
  });
});
