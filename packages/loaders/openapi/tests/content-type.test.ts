import { createRouter, Response } from 'fets';
import { execute, parse } from 'graphql';
import loadGraphQLSchemaFromOpenAPI from '../src/index.js';

describe('Query Params with POST', () => {
  const server = createRouter().route({
    method: 'POST',
    path: '/post',
    handler: req =>
      Response.json({
        contentType: req.headers.get('content-type'),
      }),
  });
  it('should forward the correct content type', async () => {
    const schema = await loadGraphQLSchemaFromOpenAPI('test', {
      source: './fixtures/multi-content-types.yml',
      endpoint: 'http://localhost:3000',
      fetch: server.fetch as any,
      cwd: __dirname,
    });
    // With a JSON body, transport defaults `Content-Type: application/json`
    // (bare application/json is omitted from `@connect(http.headers)` SDL).
    const query = /* GraphQL */ `
      mutation Test($input: JSON) {
        post(input: $input) {
          contentType
        }
      }
    `;

    const result = await execute({
      schema,
      document: parse(query),
      variableValues: { input: { hello: 'world' } },
    });

    expect(result).toEqual({
      data: {
        post: {
          contentType: 'application/json',
        },
      },
    });
  });
});
