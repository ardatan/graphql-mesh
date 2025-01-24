/* eslint-disable import/no-nodejs-modules */
import { graphql, GraphQLSchema } from 'graphql';
import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI.js';
import { queryArgumentsApi } from './query_arguments_server.js';

let createdSchema: GraphQLSchema;

describe('OpenAPI loader: Query Arguments', () => {
  /**
   * Set up the schema first and run example API server
   */
  beforeAll(async () => {
    const endpoint = `http://localhost:3000/`;
    createdSchema = await loadGraphQLSchemaFromOpenAPI('test', {
      fetch: queryArgumentsApi.fetch,
      endpoint,
      source: './fixtures/query_arguments.json',
      cwd: __dirname,
    });
  });

  it('Query Arguments', async () => {
    const query = /* GraphQL */ `
      {
        todos(id__in: [1, 2]) {
          id
        }
      }
    `;

    const result = await graphql({ schema: createdSchema, source: query });

    expect(result).toEqual({
      data: {
        todos: [
          {
            id: 1,
          },
          {
            id: 2,
          },
        ],
      },
    });
  });
});
