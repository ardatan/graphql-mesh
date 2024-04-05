import { execute, GraphQLSchema, parse } from 'graphql';
import { Request, Response } from '@whatwg-node/fetch';
import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI.js';

let createdSchema: GraphQLSchema;

describe('OpenAPI loader: Int64 input', () => {
  /**
   * Set up the schema first and run example API server
   */
  beforeAll(async () => {
    const endpoint = `http://localhost:3000/`;
    createdSchema = await loadGraphQLSchemaFromOpenAPI('test', {
      async fetch(input, init) {
        const req = new Request(input, init);
        const json = await req.json<{ id: string; name: string }>();

        return Response.json({ name: json.name });
      },
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
