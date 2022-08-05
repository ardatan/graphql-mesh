import { InMemoryStoreStorageAdapter, MeshStore } from '@graphql-mesh/store';
import { defaultImportFn, DefaultLogger, getHeadersObj, PubSub } from '@graphql-mesh/utils';
import { execute, parse } from 'graphql';
import LocalforageCache from '@graphql-mesh/cache-localforage';
import JsonSchemaHandler from '../src';
import { Headers, Response } from '@whatwg-node/fetch';

describe('JSON Schema Handler', () => {
  it('should accept a code file for operationHeaders', async () => {
    const handler = new JsonSchemaHandler({
      config: {
        operationHeaders: './fixtures/operationHeaders.ts' as any,
        baseUrl: 'http://localhost:8080',
        operations: [
          {
            type: 'Query',
            field: 'test',
            method: 'GET',
            path: '/test',
            responseSchema: {
              type: 'object',
              properties: {
                'x-foo': {
                  type: 'string',
                },
              },
            },
          },
        ],
      },
      baseDir: __dirname,
      name: 'Test',
      cache: new LocalforageCache(),
      store: new MeshStore('test', new InMemoryStoreStorageAdapter(), {
        readonly: false,
        validate: false,
      }),
      pubsub: new PubSub(),
      logger: new DefaultLogger('test'),
      importFn: defaultImportFn,
      async fetchFn(info: RequestInfo, init?: RequestInit) {
        const headers = typeof info === 'string' ? init?.headers : info.headers;
        const headersObj = getHeadersObj(new Headers(headers || {}));
        return new Response(JSON.stringify(headersObj), {
          headers: {
            'Content-Type': 'application/json',
          },
        });
      },
    });

    const { schema } = await handler.getMeshSource();

    const query = /* GraphQL */ `
      query Test {
        test {
          x_foo
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
          x_foo: 'bar',
        },
      },
    });
  });
});
