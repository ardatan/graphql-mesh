import { createServer, YogaNodeServerInstance } from '@graphql-yoga/node';
import { fetch, File, FormData } from '@whatwg-node/fetch';
import { graphql, GraphQLSchema } from 'graphql';
import { startServer as startAPIServer, stopServer as stopAPIServer } from './file_upload_api_server';
import loadGraphQLSchemaFromOpenAPI from '../src';
import getPort from 'get-port';

let createdSchema: GraphQLSchema;
let yoga: YogaNodeServerInstance<any, any, any>;

beforeAll(async () => {
  const API_PORT = await getPort();
  createdSchema = await loadGraphQLSchemaFromOpenAPI('file_upload', {
    source: './fixtures/file_upload.json',
    cwd: __dirname,
    baseUrl: `http://127.0.0.1:${API_PORT}/api`,
    fetch,
  });
  const GRAPHQL_PORT = await getPort();
  yoga = createServer({
    schema: createdSchema,
    port: GRAPHQL_PORT,
    maskedErrors: false,
    logging: false,
  });
  await Promise.all([yoga.start(), startAPIServer(API_PORT)]);
});

afterAll(async () => {
  await Promise.all([stopAPIServer(), yoga.stop()]);
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
  // Setup GraphQL for integration test
  const graphqlServer = createServer({
    schema: createdSchema,
    port: 9864,
    maskedErrors: false,
    logging: false,
  });

  await graphqlServer.start();

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

  const response = await fetch(`http://127.0.0.1:9864/graphql`, { method: 'POST', body: form });
  const uploadResult: any = await response.json();

  expect(uploadResult).toEqual({
    data: {
      fileUploadTest: {
        name: 'hello.txt',
        content: 'Hello World!',
      },
    },
  });

  await graphqlServer.stop();
});
