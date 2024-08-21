import { createRouter, Response } from 'fets';
import { execute, GraphQLSchema, parse } from 'graphql';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { loadGraphQLSchemaFromOpenAPI } from '../src/index.js';

describe('Escaped Values', () => {
  const router = createRouter({
    base: '/api',
  }).route({
    method: 'GET',
    path: '/test',
    handler() {
      return Response.json({
        test: 0,
      });
    },
  });
  let createdSchema: GraphQLSchema;
  beforeAll(async () => {
    createdSchema = await loadGraphQLSchemaFromOpenAPI('escaped_values', {
      source: './fixtures/escaped-values.json',
      cwd: __dirname,
      endpoint: 'http://localhost:3000/api',
      fetch: router.fetch as any,
    });
  });
  it('should generate the correct schema', () => {
    expect(printSchemaWithDirectives(createdSchema)).toMatchSnapshot('escaped_values-schema');
  });
  it('should represent escaped values correctly', async () => {
    const query = /* GraphQL */ `
      query {
        test {
          test
        }
      }
    `;
    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });
    expect(result).toMatchObject({
      data: {
        test: {
          test: '_0',
        },
      },
    });
  });
});
