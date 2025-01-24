import { execute, GraphQLSchema, parse } from 'graphql';
import { fetch, Response } from '@whatwg-node/fetch';
import loadGraphQLSchemaFromOpenAPI from '../src/index.js';

describe('Explode parameter', () => {
  let schema: GraphQLSchema;
  beforeAll(async () => {
    schema = await loadGraphQLSchemaFromOpenAPI('explode', {
      source: './fixtures/explode.yml',
      cwd: __dirname,
      fetch(url) {
        if (url.startsWith('file:')) {
          return fetch(url);
        }
        return Response.json({
          url,
        });
      },
    });
  });
  it('should repeat the params if explode is false', async () => {
    const document = parse(/* GraphQL */ `
      query Test {
        testExplodeParameterFalse(
          explodedArray: ["abc", "def"]
          explodedObject: { key1: "value1", key2: "value2" }
          explodedString: "ghi"
        ) {
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
          url: 'http://localhost:7777/test-false?explodedArray=abc%2Cdef&explodedObject%5Bkey1%5D=value1&explodedObject%5Bkey2%5D=value2&explodedString=ghi',
        },
      },
    });
  });
  it('should repeat the params if explode is true', async () => {
    const document = parse(/* GraphQL */ `
      query Test {
        testExplodeParameterTrue(
          explodedArray: ["abc", "def"]
          explodedObject: { key1: "value1", key2: "value2" }
          explodedString: "ghi"
        ) {
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
          url: 'http://localhost:7777/test-true?explodedArray=abc&explodedArray=def&key1=value1&key2=value2&explodedString=ghi',
        },
      },
    });
  });
});
