/* eslint-disable import/no-extraneous-dependencies */
import { parse } from 'graphql';
import LocalforageCache from '@graphql-mesh/cache-inmemory-lru';
import { InMemoryStoreStorageAdapter, MeshStore } from '@graphql-mesh/store';
import type { Logger } from '@graphql-mesh/types';
import { defaultImportFn, getHeadersObj, PubSub } from '@graphql-mesh/utils';
import { normalizedExecutor } from '@graphql-tools/executor';
import { Headers, Response } from '@whatwg-node/fetch';
import JsonSchemaHandler from '../src/index.js';

describe('JSON Schema Handler', () => {
  const logger: Logger = {
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: () => logger,
  };
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
      cache: new LocalforageCache(),
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
