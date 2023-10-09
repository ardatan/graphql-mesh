/* eslint-disable import/no-nodejs-modules */
import { execute, graphql, GraphQLSchema, parse } from 'graphql';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { createRouter, Response } from '@whatwg-node/router';
import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI.js';

let createdSchema: GraphQLSchema;

describe('OpenAPI loader: Int64 input', () => {
  /**
   * Set up the schema first and run example API server
   */
  beforeAll(async () => {
    const server = createRouter();

    server.post('/sample', async req => {
      const json = await req.json<{ id: string; name: string }>();

      return new Response(JSON.stringify({ name: json.name }), {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    const endpoint = `http://localhost:3000/`;
    createdSchema = await loadGraphQLSchemaFromOpenAPI('test', {
      fetch: server.fetch as any,
      endpoint,
      source: './fixtures/int64-input.yml',
      cwd: __dirname,
    });
  });

  it('bigint in input object should be parsed', async () => {
    const result = await execute({
      schema: createdSchema,
      document: parse(/* GraphQL */ `
        mutation {
          createSample(input: { id: 1, name: "test" }) {
            name
          }
        }
      `),
    });

    expect(result).toEqual({
      data: {
        createSample: {
          name: 'test',
        },
      },
    });
  });
});
