/* eslint-disable import/no-nodejs-modules */
import { execute, OperationTypeNode, parse } from 'graphql';
import { createDisposableServer } from '../../../testing/createDisposableServer.js';
import { loadGraphQLSchemaFromJSONSchemas } from '../src/loadGraphQLSchemaFromJSONSchemas.js';

describe('Timeout', () => {
  let timeout: NodeJS.Timeout;
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
    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        query {
          test
        }
      `),
    });
    expect(result?.errors?.[0]).toBeDefined();
  });
});
