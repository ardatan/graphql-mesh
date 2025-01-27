import { execute, GraphQLSchema, parse } from 'graphql';
import { fetch, Response } from '@whatwg-node/fetch';
import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI.js';

let createdSchema: GraphQLSchema;

describe('Empty JSON response', () => {
  /**
   * Set up the schema first and run example API server
   */
  beforeAll(async () => {
    createdSchema = await loadGraphQLSchemaFromOpenAPI('test', {
      fetch(input, _init) {
        if (input.startsWith('file:')) {
          return fetch(input);
        }
        return new Response(undefined, {
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': '0',
          },
          status: 200,
        });
      },
      source: './fixtures/empty-response.yml',
      cwd: __dirname,
    });
  });

  it('should not throw when response content length is 0', async () => {
    const result = await execute({
      schema: createdSchema,
      document: parse(/* GraphQL */ `
        mutation {
          deleteUser
        }
      `),
    });

    expect(result).toEqual({
      data: {
        deleteUser: {},
      },
    });
  });
});
