import { createRouter, Response } from 'fets';
import { execute, parse } from 'graphql';
import loadGraphQLSchemaFromOpenAPI from '../src/index.js';

describe('Query Params with POST', () => {
  const queryParamsWithPostServer = createRouter().route({
    method: 'POST',
    path: '/post-with-param',
    handler: req =>
      Response.json({
        url: req.url,
      }),
  });
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
