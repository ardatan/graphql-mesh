/* eslint-disable import/no-nodejs-modules */
import { execute, GraphQLSchema, parse } from 'graphql';

import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI';
import { startServer } from './example_api8_server';
import { fetch } from '@whatwg-node/fetch';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { Server } from 'http';
import { AddressInfo } from 'net';

let createdSchema: GraphQLSchema;

/**
 * This test suite is used to verify the behavior of the upstream api returning an empty 404 response
 */
describe('OpenAPI loader: Empty upstream 404 response', () => {
  let server: Server;
  /**
   * Set up the schema first and run example API server
   */
  beforeAll(async () => {
    server = await startServer();
    const baseUrl = `http://localhost:${(server.address() as AddressInfo).port}/api`;
    createdSchema = await loadGraphQLSchemaFromOpenAPI('test', {
      fetch,
      baseUrl,
      source: './fixtures/example_oas8.json',
      cwd: __dirname,
    });
  });

  /**
   * Shut down API server
   */
  afterAll(done => {
    server.close(done);
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
          [GraphQLError: HTTP Error: 404, Could not invoke operation GET /user],
        ],
      }
    `);
  });
});
