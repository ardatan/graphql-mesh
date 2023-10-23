import { execute, GraphQLSchema, parse } from 'graphql';
import { Response } from '@whatwg-node/fetch';
import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI.js';

describe('additional properties in union type', () => {
  let createdSchema: GraphQLSchema;
  beforeAll(async () => {
    createdSchema = await loadGraphQLSchemaFromOpenAPI('test', {
      source: './fixtures/one-of-no-discriminator.yml',
      cwd: __dirname,
      ignoreErrorResponses: true,
      async fetch(url, options, context) {
        return Response.json({
          type2: 'TestType', // this breaks
          B: 'Value',
        });
      },
    });
  });
  it('should handle object response', async () => {
    const query = /* GraphQL */ `
      mutation {
        test_endpoint(input: { mutation_test_endpoint_oneOf_1_Input: { B: "string" } }) {
          ... on mutation_test_endpoint_oneOf_1 {
            B
          }
          ... on A_const_container {
            A_const
          }
        }
      }
    `;
    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });
    expect(result).toEqual({
      data: {
        test_endpoint: {
          B: 'Value',
        },
      },
    });
  });
});
