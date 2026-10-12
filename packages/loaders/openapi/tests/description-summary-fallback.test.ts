import { assertObjectType } from 'graphql';
import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI.js';

const openApiSource = {
  openapi: '3.0.0',
  info: { title: 'Description fallback', version: '1.0.0' },
  paths: {
    '/pets': {
      get: {
        operationId: 'listPets',
        summary: 'List all pets',
        description: '   ',
        responses: {
          '200': {
            description: 'ok',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
            },
          },
        },
      },
      post: {
        operationId: 'createPet',
        summary: 'Create a pet',
        description: '   ',
        responses: {
          '202': {
            description: 'accepted',
          },
        },
        callbacks: {
          petCreated: {
            'https://example.com/hook': {
              post: {
                operationId: 'onPetCreated',
                summary: 'Notify when a pet is created',
                description: '   ',
                requestBody: {
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                        },
                      },
                    },
                  },
                },
                responses: {
                  '200': {
                    description: 'OK',
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

describe('OpenAPI description / summary fallback', () => {
  it('uses summary when operation description is whitespace-only', async () => {
    const schema = await loadGraphQLSchemaFromOpenAPI('test', {
      endpoint: 'http://localhost',
      source: openApiSource as any,
    });

    const query = assertObjectType(schema.getQueryType());
    expect(query.getFields().listPets.description).toBe('List all pets');

    const mutation = assertObjectType(schema.getMutationType());
    expect(mutation.getFields().createPet.description).toBe('Create a pet');
  });

  it('uses summary when callback description is whitespace-only', async () => {
    const schema = await loadGraphQLSchemaFromOpenAPI('test', {
      endpoint: 'http://localhost',
      source: openApiSource as any,
    });

    const subscription = assertObjectType(schema.getSubscriptionType());
    expect(subscription.getFields().onPetCreated.description).toBe('Notify when a pet is created');
  });
});
