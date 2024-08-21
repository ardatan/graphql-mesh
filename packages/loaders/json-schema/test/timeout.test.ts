/* eslint-disable import/no-nodejs-modules */
import { OperationTypeNode, parse } from 'graphql';
import { normalizedExecutor } from '@graphql-tools/executor';
import { isAsyncIterable } from '@graphql-tools/utils';
import { createDisposableServer } from '../../../testing/createDisposableServer.js';
import { loadGraphQLSchemaFromJSONSchemas } from '../src/loadGraphQLSchemaFromJSONSchemas.js';

describe('Timeout', () => {
  let timeout: NodeJS.Timeout;
  afterEach(() => {
    if (timeout) {
      clearTimeout(timeout);
    }
  });
  it('should timeout correctly', async () => {
    await using server = await createDisposableServer((req, res) => {
      timeout = setTimeout(() => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('test');
      }, 500);
    });
    const schema = await loadGraphQLSchemaFromJSONSchemas('test', {
      timeout: 300,
      endpoint: `http://localhost:${server.address().port}`,
      operations: [
        {
          type: OperationTypeNode.QUERY,
          field: 'test',
          method: 'GET',
          path: '/test',
          responseSchema: {
            type: 'object',
          },
        },
      ],
    });
    const result = await normalizedExecutor({
      schema,
      document: parse(/* GraphQL */ `
        query {
          test
        }
      `),
    });
    if (isAsyncIterable(result)) {
      throw new Error('Should not be async iterable');
    }
    expect(result?.errors?.[0]).toBeDefined();
  });
});
