import { execute, parse } from 'graphql';
import loadGraphQLSchemaFromOpenAPI from '../src';
import { Request, Response } from '@whatwg-node/fetch';

describe('Query Params with POST', () => {
  it('should create URLs with correctly concatenated query params for POST requests', async () => {
    const schema = await loadGraphQLSchemaFromOpenAPI('test', {
      oasFilePath: './fixtures/query-params-with-post.yml',
      baseUrl: 'http://localhost:3000',
      async fetch(info: RequestInfo, init?: RequestInit) {
        let request: Request;
        if (typeof info !== 'object') {
          request = new Request(info, init);
        } else {
          request = info;
        }
        return new Response(
          JSON.stringify({
            url: request.url,
          }),
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      },
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
