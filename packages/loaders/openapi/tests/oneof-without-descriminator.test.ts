import { execute, GraphQLSchema, parse } from 'graphql';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { fetch, Response } from '@whatwg-node/fetch';
import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI.js';

describe('oneOf without discriminator', () => {
  let createdSchema: GraphQLSchema;
  beforeAll(async () => {
    createdSchema = await loadGraphQLSchemaFromOpenAPI('test', {
      source: './fixtures/one-of-no-discriminator.yml',
      cwd: __dirname,
      ignoreErrorResponses: true,
      fetch(url, options, context) {
        if (url.startsWith('file:')) {
          return fetch(url, options);
        }
        switch (options.body) {
          case '{"B":"string"}':
            return Response.json({
              B: 'Value',
            });
          case '"A"':
            return Response.json('A');
          default:
            return new Response(null, {
              status: 404,
            });
        }
      },
    });
  });
  it('should generate correct schema', () => {
    expect(printSchemaWithDirectives(createdSchema)).toMatchSnapshot('discriminator-mapping');
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
  it('should handle enum response', async () => {
    const query = /* GraphQL */ `
      mutation {
        test_endpoint(input: { A_const: A }) {
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
      contextValue: { requestId: 1 },
    });
    expect(result).toEqual({
      data: {
        test_endpoint: {
          A_const: 'A',
        },
      },
    });
  });
});
