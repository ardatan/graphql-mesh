import { execute, parse } from 'graphql';
import { createRouter, Response } from '@whatwg-node/router';
import loadGraphQLSchemaFromOpenAPI from '../src/index.js';

describe('Query Params with POST', () => {
  const server = createRouter();
  server.post(
    '/post',
    request =>
      new Response(
        JSON.stringify({
          contentType: request.headers.get('content-type')
        }),
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
  );
  it('should forward the correct content type', async () => {
    const schema = await loadGraphQLSchemaFromOpenAPI('test', {
      source: './fixtures/multi-content-types.yml',
      endpoint: 'http://localhost:3000',
      fetch: server.fetch as any,
      cwd: __dirname,
    });
    const query = /* GraphQL */ `
      mutation Test {
        post {
          contentType
        }
      }
    `;

    const result = await execute({
      schema,
      document: parse(query),
    });

    expect(result).toEqual({
      data: {
        post: {
          contentType: 'application/json'
        },
      },
    });
  });
});
