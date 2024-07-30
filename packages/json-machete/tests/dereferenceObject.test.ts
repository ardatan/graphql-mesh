// eslint-disable-next-line import/no-nodejs-modules
import { readFileSync } from 'fs';
import type { JSONSchemaObject } from '@json-schema-tools/meta-schema';
import { dereferenceObject } from '../src/dereferenceObject.js';

describe('dereferenceObject', () => {
  it('should resolve all $ref', async () => {
    const schema = {
      $ref: '#/definitions/Container',
      definitions: {
        Container: {
          type: 'object',
          title: 'Container',
          properties: {
            authors: {
              type: 'array',
              items: {
                $ref: '#/definitions/Author',
              },
            },
            posts: {
              type: 'array',
              items: {
                $ref: '#/definitions/Post',
              },
            },
          },
        },
        Author: {
          type: 'object',
          title: 'Author',
          properties: {
            id: {
              type: 'string',
            },
            name: {
              type: 'string',
            },
          },
        },
        Post: {
          type: 'object',
          title: 'Post',
          properties: {
            id: {
              type: 'string',
            },
            title: {
              type: 'string',
            },
            content: {
              type: 'string',
            },
            author: {
              $ref: '#/definitions/Author',
            },
          },
        },
      },
    };
    const result = await dereferenceObject<JSONSchemaObject>(schema, { readFileOrUrl: () => null });
    expect(result.title).toBe('Container');
    expect(result.properties.posts.items.title).toBe('Post');
    expect(result.properties.posts.items.properties.author.title).toBe('Author');
    expect(
      result.properties.posts.items.properties.author === result.properties.authors.items,
    ).toBeTruthy();
  });
  it('should dereference external references', async () => {
    const result = await dereferenceObject<JSONSchemaObject>(
      {
        $ref: './fixtures/PostsResponse.json',
      },
      {
        cwd: __dirname,
        readFileOrUrl: path => JSON.parse(readFileSync(path, 'utf8')),
      },
    );
    expect(result.title).toBe('PostsResponse');
    expect(result.properties.items.items.title).toBe('Post');
    expect(result.properties.items.items.properties.author.title).toBe('Author');
  });
  it('should dereference OpenAPI schemas', async () => {
    const openapiSchema = {
      openapi: '3.0.0',
      info: {
        version: '1.0.0',
        title: 'Swagger Petstore',
        license: {
          name: 'MIT',
        },
      },
      servers: [
        {
          url: 'http://petstore.swagger.io/v1',
        },
      ],
      paths: {
        '/pets': {
          get: {
            summary: 'List all pets',
            operationId: 'listPets',
            tags: ['pets'],
            parameters: [
              {
                name: 'limit',
                in: 'query',
                description: 'How many items to return at one time (max 100)',
                required: false,
                schema: {
                  type: 'integer',
                  format: 'int32',
                },
              },
            ],
            responses: {
              '200': {
                description: 'A paged array of pets',
                headers: {
                  'x-next': {
                    description: 'A link to the next page of responses',
                    schema: {
                      type: 'string',
                    },
                  },
                },
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/Pets',
                    },
                  },
                },
              },
              default: {
                description: 'unexpected error',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/Error',
                    },
                  },
                },
              },
            },
          },
          post: {
            summary: 'Create a pet',
            operationId: 'createPets',
            tags: ['pets'],
            responses: {
              '201': {
                description: 'Null response',
              },
              default: {
                description: 'unexpected error',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/Error',
                    },
                  },
                },
              },
            },
          },
        },
        '/pets/{petId}': {
          get: {
            summary: 'Info for a specific pet',
            operationId: 'showPetById',
            tags: ['pets'],
            parameters: [
              {
                name: 'petId',
                in: 'path',
                required: true,
                description: 'The id of the pet to retrieve',
                schema: {
                  type: 'string',
                },
              },
            ],
            responses: {
              '200': {
                description: 'Expected response to a valid request',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/Pet',
                    },
                  },
                },
              },
              default: {
                description: 'unexpected error',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/Error',
                    },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          Pet: {
            type: 'object',
            required: ['id', 'name'],
            properties: {
              id: {
                type: 'integer',
                format: 'int64',
              },
              name: {
                type: 'string',
              },
              tag: {
                type: 'string',
              },
            },
          },
          Pets: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/Pet',
            },
          },
          Error: {
            type: 'object',
            required: ['code', 'message'],
            properties: {
              code: {
                type: 'integer',
                format: 'int32',
              },
              message: {
                type: 'string',
              },
            },
          },
        },
      },
    };
    const dereferencedObject = await dereferenceObject(openapiSchema, {
      readFileOrUrl: () => null,
    });
    expect(
      dereferencedObject.paths['/pets/{petId}'].get.responses[200].content['application/json']
        .schema,
    ).toBe(openapiSchema.components.schemas.Pet);
    expect(
      dereferencedObject.paths['/pets'].get.responses[200].content['application/json'].schema,
    ).toBe(openapiSchema.components.schemas.Pets);
  });
});
