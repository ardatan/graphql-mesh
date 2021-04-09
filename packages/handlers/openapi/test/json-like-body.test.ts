import { printSchema } from 'graphql';
import { createGraphQLSchema } from '../src/openapi-to-graphql';

describe('JSON Like Bodies', () => {
  it('should treat */* as application/json', async () => {
    const openAPISchema = {
      openapi: '3.0.1',
      info: {
        title: 'OpenAPI definition',
        version: 'v0',
      },
      servers: [
        {
          url: 'https://not-real.com',
          description: 'Generated server url',
        },
      ],
      paths: {
        '/api/v1/countries': {
          get: {
            tags: ['Attributes'],
            operationId: 'retrieveCountries',
            responses: {
              '200': {
                description: 'OK',
                content: {
                  '*/*': {
                    schema: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/Country',
                      },
                    },
                  },
                },
              },
            },
          },
        },
        '/api/v1/provinces/country/{countryID}': {
          get: {
            tags: ['Attributes'],
            operationId: 'retrieveProvinces',
            parameters: [
              {
                name: 'countryID',
                in: 'path',
                required: true,
                schema: {
                  type: 'string',
                },
              },
            ],
            responses: {
              '200': {
                description: 'OK',
                content: {
                  '*/*': {
                    schema: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/Province',
                      },
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
          Country: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
              },
              name: {
                type: 'string',
              },
              id: {
                type: 'string',
              },
            },
          },
          Province: {
            type: 'object',
            properties: {
              country: {
                $ref: '#/components/schemas/Country',
              },
              name: {
                type: 'string',
              },
              id: {
                type: 'string',
              },
            },
          },
        },
      },
    };
    const graphQLSchema = await createGraphQLSchema(openAPISchema as any);
    expect(printSchema(graphQLSchema.schema)).toMatchSnapshot('*/* snapshot');
  });
});
