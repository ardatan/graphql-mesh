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
});
