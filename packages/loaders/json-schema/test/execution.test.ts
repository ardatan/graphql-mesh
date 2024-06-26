import { execute, OperationTypeNode, parse } from 'graphql';
import { getHeadersObj } from '@graphql-mesh/utils';
import { Request, Response } from '@whatwg-node/fetch';
import loadGraphQLSchemaFromJSONSchemas from '../src/index.js';

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
      endpoint: 'http://localhost:3000',
      operations: [
        {
          type: OperationTypeNode.QUERY,
          method: 'GET',
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
            },
          );
        },
        endpoint: 'http://localhost:3000',
        operations: [
          {
            type: OperationTypeNode.QUERY,
            field: 'test',
            method: 'GET',
            path: '/test',
            queryParamArgMap: {
              foo: 'foo',
            },
            argTypeMap: {
              foo: {
                type: 'array',
                items: {
                  type: 'string',
                },
              },
            },
            responseSample: {
              url: 'http://localhost:3000/test?foo=bar&foo=baz',
            },
          },
        ],
      });
      const query = /* GraphQL */ `
        query Test {
          test(foo: ["bar", "baz"]) {
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
            },
          );
        },
        endpoint: 'http://localhost:3000',
        queryStringOptions: {
          indices: true,
        },
        operations: [
          {
            type: OperationTypeNode.QUERY,
            field: 'test',
            method: 'GET',
            path: '/test',
            queryParamArgMap: {
              foo: 'foo',
            },
            argTypeMap: {
              foo: {
                type: 'array',
                items: {
                  type: 'string',
                },
              },
            },
            responseSample: {
              url: 'http://localhost:3000/test?foo[0]=bar&foo[1]=baz',
            },
          },
        ],
      });
      const query = /* GraphQL */ `
        query Test {
          test(foo: ["bar", "baz"]) {
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
            url: `http://localhost:3000/test?foo${encodeURIComponent(
              '[0]',
            )}=bar&foo${encodeURIComponent('[1]')}=baz`,
          },
        },
      });
    });
    it('should not add indices if arrayFormat is configured to brackets', async () => {
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
            },
          );
        },
        endpoint: 'http://localhost:3000',
        queryStringOptions: {
          arrayFormat: 'brackets',
        },
        operations: [
          {
            type: OperationTypeNode.QUERY,
            field: 'test',
            method: 'GET',
            path: '/test',
            queryParamArgMap: {
              foo: 'foo',
            },
            argTypeMap: {
              foo: {
                type: 'array',
                items: {
                  type: 'string',
                },
              },
            },
            responseSample: {
              url: 'http://localhost:3000/test?foo[]=bar&foo[]=baz',
            },
          },
        ],
      });
      const query = /* GraphQL */ `
        query Test {
          test(foo: ["bar", "baz"]) {
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
            url: `http://localhost:3000/test?foo${encodeURIComponent(
              '[]',
            )}=bar&foo${encodeURIComponent('[]')}=baz`,
          },
        },
      });
    });
    it('should add brackets even if there is a single item in the array and arrayFormat is brackets together with commaRoundTrip: true', async () => {
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
            },
          );
        },
        endpoint: 'http://localhost:3000',
        queryStringOptions: {
          arrayFormat: 'brackets',
        },
        operations: [
          {
            type: OperationTypeNode.QUERY,
            field: 'test',
            method: 'GET',
            path: '/test',
            queryParamArgMap: {
              foo: 'foo',
            },
            argTypeMap: {
              foo: {
                type: 'array',
                items: {
                  type: 'string',
                },
              },
            },
            responseSample: {
              url: 'http://localhost:3000/test?foo[]=bar',
            },
          },
        ],
      });
      const query = /* GraphQL */ `
        query Test {
          test(foo: ["bar"]) {
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
            url: `http://localhost:3000/test?foo${encodeURIComponent('[]')}=bar`,
          },
        },
      });
    });
    it('jsonStringify', async () => {
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
            },
          );
        },
        endpoint: 'http://localhost:3000',
        queryStringOptions: {
          jsonStringify: true,
        },
        operations: [
          {
            type: OperationTypeNode.QUERY,
            field: 'test',
            method: 'GET',
            path: '/test',
            queryParamArgMap: {
              foo: 'foo',
            },
            argTypeMap: {
              foo: {
                type: 'object',
                properties: {
                  bar: {
                    type: 'string',
                  },
                },
              },
            },
            responseSample: {
              url: 'http://localhost:3000/test?foo={"bar":"baz"}',
            },
          },
        ],
      });
      const query = /* GraphQL */ `
        query Test {
          test(foo: { bar: "baz" }) {
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
            url: `http://localhost:3000/test?foo=${encodeURIComponent('{"bar":"baz"}')}`,
          },
        },
      });
    });
  });
  describe('Sanization', () => {
    it('should recover escaped input field names before preparing the request for GET', async () => {
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
            },
          );
        },
        endpoint: 'http://localhost:3000',
        operations: [
          {
            type: OperationTypeNode.QUERY,
            field: 'test',
            method: 'GET',
            path: '/test?foo-bar={args.foo_bar}',
            responseSample: {
              url: 'http://localhost:3000/test?foo-bar=baz',
            },
          },
        ],
      });

      const query = /* GraphQL */ `
        query Test {
          test(foo_bar: "baz") {
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
            url: `http://localhost:3000/test?foo-bar=baz`,
          },
        },
      });
    });
    it('should recover escaped input field names before preparing the request for POST', async () => {
      const expectedInput = {
        'foo-bar': 'baz',
      };
      let receivedInput: typeof expectedInput;
      const schema = await loadGraphQLSchemaFromJSONSchemas('test', {
        async fetch(info: RequestInfo, init?: RequestInit) {
          let request: Request;
          if (typeof info !== 'object') {
            request = new Request(info, init);
          } else {
            request = info;
          }
          receivedInput = await request.json();
          return new Response(JSON.stringify({}), {
            headers: {
              'Content-Type': 'application/json',
            },
          });
        },
        endpoint: 'http://localhost:3000',
        operations: [
          {
            type: OperationTypeNode.QUERY,
            field: 'test',
            method: 'POST',
            path: '/test',
            requestSample: expectedInput,
          },
        ],
      });

      const query = /* GraphQL */ `
        query Test {
          test(input: { foo_bar: "baz" }) {
            foo_bar
          }
        }
      `;

      await execute({
        schema,
        document: parse(query),
      });

      expect(receivedInput).toEqual(expectedInput);
    });
  });
  it('List results', async () => {
    const schema = await loadGraphQLSchemaFromJSONSchemas('test', {
      cwd: __dirname,
      operations: [
        {
          type: OperationTypeNode.QUERY,
          field: 'getTest',
          method: 'GET',
          path: '/test',
          responseSchema: './fixtures/list-results.schema.json#/definitions/Test',
        },
      ],
      fetch: async () => Response.json(['foo', 'bar', 'baz']),
    });
    const query = /* GraphQL */ `
      query Test {
        getTest
      }
    `;
    const result = await execute({
      schema,
      document: parse(query),
    });
    expect(result).toEqual({
      data: {
        getTest: ['foo', 'bar', 'baz'],
      },
    });
  });
});
