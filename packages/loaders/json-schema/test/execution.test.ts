import { getHeadersObj } from '@graphql-mesh/utils';
import { Request, Response } from '@whatwg-node/fetch';
import { execute, OperationTypeNode, parse } from 'graphql';
import loadGraphQLSchemaFromJSONSchemas from '../src';

describe('Execution', () => {
  it('should not send headers with empty value', async () => {
    const schema = await loadGraphQLSchemaFromJSONSchemas('test', {
      async fetch(info: RequestInfo, init?: RequestInit) {
        let request: Request;
        if (typeof info !== 'object') {
          request = new Request(info, init);
        } else {
          request = info;
        }
        return new Response(JSON.stringify(getHeadersObj(request.headers)), {
          headers: {
            'Content-Type': 'application/json',
          },
        });
      },
      baseUrl: 'http://localhost:3000',
      operations: [
        {
          type: OperationTypeNode.QUERY,
          field: 'test',
          path: '/test',
          headers: {
            test: '{context.test}',
          },
          responseSchema: {
            title: 'Test',
            type: 'object',
            properties: {
              test: {
                type: 'string',
              },
            },
          },
        },
      ],
    });

    const query = /* GraphQL */ `
      query Test {
        test {
          test
        }
      }
    `;

    const result = await execute({
      schema,
      document: parse(query),
      contextValue: {
        test: 'TEST',
      },
    });

    expect(result).toEqual({
      data: {
        test: {
          test: 'TEST',
        },
      },
    });

    const result2 = await execute({
      schema,
      document: parse(query),
      contextValue: {},
    });

    expect(result2).toEqual({
      data: {
        test: {
          test: null,
        },
      },
    });
  });
  describe('Query Stringify Configuration', () => {
    it('should not send array values without indices by default', async () => {
      const schema = await loadGraphQLSchemaFromJSONSchemas('test', {
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
        baseUrl: 'http://localhost:3000',
        operations: [
          {
            type: OperationTypeNode.QUERY,
            field: 'test',
            method: 'GET',
            path: '/test',
            requestSample: {
              foo: ['bar', 'baz'],
            },
            responseSample: {
              url: 'http://localhost:3000/test?foo=bar&foo=baz',
            },
          },
        ],
      });
      const query = /* GraphQL */ `
        query Test {
          test(input: { foo: ["bar", "baz"] }) {
            url
          }
        }
      `;
      const result = await execute({
        schema,
        document: parse(query),
      });
      console.log(result.errors);
      expect(result).toEqual({
        data: {
          test: {
            url: 'http://localhost:3000/test?foo=bar&foo=baz',
          },
        },
      });
    });
    it('should not send array values with indices if configured', async () => {
      const schema = await loadGraphQLSchemaFromJSONSchemas('test', {
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
        baseUrl: 'http://localhost:3000',
        indices: true,
        operations: [
          {
            type: OperationTypeNode.QUERY,
            field: 'test',
            method: 'GET',
            path: '/test',
            requestSample: {
              foo: ['bar', 'baz'],
            },
            responseSample: {
              url: 'http://localhost:3000/test?foo[0]=bar&foo[1]=baz',
            },
          },
        ],
      });
      const query = /* GraphQL */ `
        query Test {
          test(input: { foo: ["bar", "baz"] }) {
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
          test: {
            url: 'http://localhost:3000/test?foo%5B0%5D=bar&foo%5B1%5D=baz',
          },
        },
      });
    });
  });
});
