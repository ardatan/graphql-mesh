import { execute, GraphQLSchema, parse } from 'graphql';
import { Response } from '@whatwg-node/fetch';
import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI.js';

let createdSchema: GraphQLSchema;

describe('OpenAPI loader: form explode with oneof query parameters', () => {
  /**
   * Set up the schema first and run example API server
   */
  beforeAll(async () => {
    const endpoint = `http://localhost:3000/`;
    createdSchema = await loadGraphQLSchemaFromOpenAPI('test', {
      async fetch(input, init) {
        return Response.json({
          url: input,
        });
      },
      endpoint,
      source: './fixtures/form-explode.yml',
      cwd: __dirname,
    });
  });

  it('should serialize correct query parameters', async () => {
    const result = await execute({
      schema: createdSchema,
      document: parse(/* GraphQL */ `
        query ($intent: Intent_Input!) {
          test(intent: $intent) {
            url
          }
        }
      `),
      variableValues: {
        intent: {
          User_Intent_Input: {
            idtype: 'user',
            user_id: '1',
          },
        },
      },
    });

    expect(result).toEqual({
      data: {
        test: {
          url: 'http://localhost:3000/test?idtype=user&user_id=1',
        },
      },
    });
  });
});
