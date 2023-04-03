import { execute, parse } from 'graphql';
import { createRouter, Response } from '@whatwg-node/router';
import loadGraphQLSchemaFromOpenAPI from '../src/index.js';

describe('Query Params with POST', () => {
  const queryParamsWithPostServer = createRouter();
  queryParamsWithPostServer.post(
    '/post-with-param',
    request =>
      new Response(
        JSON.stringify({
          url: request.url,
        }),
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
  );
  it('should create URLs with correctly concatenated query params for POST requests', async () => {
    const schema = await loadGraphQLSchemaFromOpenAPI('test', {
      source: './fixtures/query-params-with-post.yml',
      endpoint: 'http://localhost:3000',
      fetch: queryParamsWithPostServer.fetch as any,
      cwd: __dirname,
    });
    const query = /* GraphQL */ `
      mutation Test {
        postWithParam(
          queryparamfirst: "queryfirstvalue"
          queryparamsecond: "querysecondvalue"
          input: { randomField: "IGNORE_THIS" }
        ) {
          url
        }
      }
    `;

    const result = await execute({
      schema,
      document: parse(query),
    });

    expect(result).toEqual({
      data: {
        postWithParam: {
          url: 'http://localhost:3000/post-with-param?queryparamfirst=queryfirstvalue&queryparamsecond=querysecondvalue',
        },
      },
    });
  });
});
