import { Response } from '@whatwg-node/fetch';
import { execute, GraphQLSchema, parse } from 'graphql';
import loadGraphQLSchemaFromOpenAPI from '../src';

describe('Explode parameter', () => {
  let schema: GraphQLSchema;
  beforeAll(async () => {
    schema = await loadGraphQLSchemaFromOpenAPI('explode', {
      source: './fixtures/explode.yml',
      cwd: __dirname,
      async fetch(url) {
        return new Response(
          JSON.stringify({
            url,
          }),
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      },
    });
  });
  it('should repeat the params if explode is false', async () => {
    const document = parse(/* GraphQL */ `
      query Test {
        testExplodeParameterFalse(exploded: ["abc", "def"]) {
          url
        }
      }
    `);

    const result = await execute({
      schema,
      document,
    });

    expect(result).toEqual({
      data: {
        testExplodeParameterFalse: {
          url: 'http://localhost:7777/test-false?exploded=abc%2Cdef',
        },
      },
    });
  });
  it('should repeat the params if explode is true', async () => {
    const document = parse(/* GraphQL */ `
      query Test {
        testExplodeParameterTrue(exploded: ["abc", "def"]) {
          url
        }
      }
    `);

    const result = await execute({
      schema,
      document,
    });

    expect(result).toEqual({
      data: {
        testExplodeParameterTrue: {
          url: 'http://localhost:7777/test-true?exploded=abc&exploded=def',
        },
      },
    });
  });
});
