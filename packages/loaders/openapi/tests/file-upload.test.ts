/* eslint-disable import/no-nodejs-modules */
import { createYoga } from 'graphql-yoga';
import { fetch, File, FormData } from '@whatwg-node/fetch';
import { graphql, GraphQLSchema } from 'graphql';
import {
  startServer as startAPIServer,
  stopServer as stopAPIServer,
} from './file_upload_api_server.js';
import loadGraphQLSchemaFromOpenAPI from '../src/index.js';
import { createServer, Server } from 'http';
import { AddressInfo } from 'net';

let createdSchema: GraphQLSchema;
let server: Server;

beforeAll(async () => {
  const apiServer = await startAPIServer();
  const apiPort = (apiServer.address() as AddressInfo).port;

  createdSchema = await loadGraphQLSchemaFromOpenAPI('file_upload', {
    source: './fixtures/file_upload.json',
    cwd: __dirname,
    endpoint: `http://127.0.0.1:${apiPort}/api`,
    fetch,
  });
  const yoga = createYoga({
    schema: createdSchema,
    maskedErrors: false,
    logging: false,
  });

  server = createServer(yoga);

  await new Promise<void>(resolve => server.listen(0, resolve));
});

afterAll(async () => {
  await Promise.all([stopAPIServer(), new Promise(resolve => server.close(resolve))]);
});

test('Registers the File scalar type', async () => {
  const query = /* GraphQL */ `
    {
      __type(name: "File") {
        name
        kind
      }
    }
  `;

  const result = await graphql({
    schema: createdSchema,
    source: query,
  });
  expect(result).toEqual({
    data: {
      __type: {
        name: 'File',
        kind: 'SCALAR',
      },
    },
  });
});

test('Introspection for mutations returns a mutation matching the custom field specified for the multipart API definition', async () => {
  const query = /* GraphQL */ `
    {
      __schema {
        mutationType {
          fields {
            name
            args {
              name
              type {
                name
                kind
              }
            }
            type {
              name
              kind
            }
          }
        }
      }
    }
  `;

  const result = await graphql({
    schema: createdSchema,
    source: query,
  });

  expect(result).toEqual({
    data: {
      __schema: {
        mutationType: {
          fields: expect.arrayContaining([
            expect.objectContaining({
              name: 'fileUploadTest',
              args: expect.arrayContaining([
                expect.objectContaining({
                  name: 'input',
                }),
              ]),
            }),
          ]),
        },
      },
    },
  });
});

test('Upload completes without any error', async () => {
  const port = (server.address() as AddressInfo).port;

  // Prepare request to match GraphQL multipart request spec
  // Reference: https://github.com/jaydenseric/graphql-multipart-request-spec
  const form = new FormData();
  const query = /* GraphQL */ `
    mutation FileUploadTest($file: File!) {
      fileUploadTest(input: { file: $file }) {
        name
        content
      }
    }
  `;
  form.append('operations', JSON.stringify({ query, variables: { file: null } }));
  form.append('map', JSON.stringify({ 0: ['variables.file'] }));
  form.append('0', new File(['Hello World!'], 'hello.txt', { type: 'text/plain' }));

  const response = await fetch(`http://127.0.0.1:${port}/graphql`, { method: 'POST', body: form });
  const uploadResult: any = await response.json();

  expect(uploadResult).toEqual({
    data: {
      fileUploadTest: {
        name: 'hello.txt',
        content: 'Hello World!',
      },
    },
  });
});
