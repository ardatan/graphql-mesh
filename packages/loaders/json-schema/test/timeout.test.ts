/* eslint-disable import/no-nodejs-modules */
import { createServer, Server } from 'http';
import { AddressInfo } from 'net';
import { execute, OperationTypeNode, parse } from 'graphql';
import { fetch } from '@whatwg-node/fetch';
import { loadGraphQLSchemaFromJSONSchemas } from '../src/loadGraphQLSchemaFromJSONSchemas';

describe('Timeout', () => {
  let server: Server;
  let timeout: NodeJS.Timeout;
  beforeAll(async () => {
    server = createServer((req, res) => {
      timeout = setTimeout(() => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('test');
      }, 500);
    });
    await new Promise<void>(resolve => server.listen(0, resolve));
  });
  afterAll(async () => {
    clearTimeout(timeout);
    await new Promise(resolve => server.close(resolve));
  });
  it('should timeout correctly', async () => {
    const schema = await loadGraphQLSchemaFromJSONSchemas('test', {
      fetch,
      timeout: 300,
      endpoint: `http://localhost:${(server.address() as AddressInfo).port}`,
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
    expect(result?.errors?.[0]?.message).toContain('The operation was aborted');
  });
});
