/* eslint-disable import/no-nodejs-modules */
import { graphql, GraphQLSchema } from 'graphql';
import { createYoga } from 'graphql-yoga';
import loadGraphQLSchemaFromOpenAPI from '../src/index.js';
import { fileUploadApi } from './file_upload_api_server.js';

let createdSchema: GraphQLSchema;
let createdSchemaYoga: ReturnType<typeof createYoga>;

beforeAll(async () => {
  createdSchema = await loadGraphQLSchemaFromOpenAPI('file_upload', {
    source: './fixtures/file_upload.json',
    cwd: __dirname,
    fetch: fileUploadApi.fetch as any,
  });
  createdSchemaYoga = createYoga({
    schema: createdSchema,
    maskedErrors: false,
    logging: !!process.env.DEBUG,
  });
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
  // Prepare request to match GraphQL multipart request spec
  // Reference: https://github.com/jaydenseric/graphql-multipart-request-spec
  const form = new createdSchemaYoga.fetchAPI.FormData();
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
  form.append(
    '0',
    new createdSchemaYoga.fetchAPI.File(['Hello World!'], 'hello.txt', { type: 'text/plain' }),
  );

  const response = await createdSchemaYoga.fetch(`http://127.0.0.1:4000/graphql`, {
    method: 'POST',
    body: form,
  });
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
