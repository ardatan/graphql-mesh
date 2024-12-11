/* eslint-disable import/no-extraneous-dependencies */
import { parse } from 'graphql';
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import { InMemoryStoreStorageAdapter, MeshStore } from '@graphql-mesh/store';
import { defaultImportFn, getHeadersObj, PubSub } from '@graphql-mesh/utils';
import { normalizedExecutor } from '@graphql-tools/executor';
import { Headers, Response } from '@whatwg-node/fetch';
import { dummyLogger as logger } from '../../../../testing/dummyLogger';
import JsonSchemaHandler from '../src/index.js';

describe('JSON Schema Handler', () => {
  // TODO: Implement this feature later
  it.skip('should accept a code file for operationHeaders', async () => {
    const handler = new JsonSchemaHandler({
      config: {
        operationHeaders: './fixtures/operationHeaders.ts' as any,
        endpoint: 'http://localhost:8080',
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
      cache: new InMemoryLRUCache(),
      store: new MeshStore('test', new InMemoryStoreStorageAdapter(), {
        readonly: false,
        validate: false,
      }),
      pubsub: new PubSub(),
      logger,
      importFn: defaultImportFn,
    });

    const { schema } = await handler.getMeshSource({
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

    const query = /* GraphQL */ `
      query Test {
        test {
          x_foo
        }
      }
    `;

    const result = await normalizedExecutor({
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
