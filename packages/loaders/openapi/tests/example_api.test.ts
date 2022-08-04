import { execute, GraphQLObjectType, GraphQLSchema, parse } from 'graphql';
import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI';

import { startServer, stopServer } from '../../../handlers/openapi/test/example_api_server';
import { join } from 'path';
import { fetch } from '@whatwg-node/fetch';
import { printSchemaWithDirectives } from '@graphql-tools/utils';

let createdSchema: GraphQLSchema;
const PORT = 3002;
const baseUrl = `http://localhost:${PORT}/api`;

describe('example_api', () => {
  beforeAll(async () => {
    createdSchema = await loadGraphQLSchemaFromOpenAPI('test', {
      fetch,
      baseUrl,
      oasFilePath: join(__dirname, '../../../handlers/openapi/test/fixtures/example_oas.json'),
    });
    await startServer(PORT);
  });
  afterAll(() => stopServer());

  it('should get descriptions', async () => {
    // Get all the descriptions of the fields on the GraphQL object type car
    const carType = createdSchema.getType('car') as GraphQLObjectType;
    expect(carType).toBeDefined();
    const carFields = carType.getFields();
    expect(carFields).toBeDefined();
    expect(carFields.model.description).toBe('The model of the car.');
    expect(carFields.color.description).toBe('The color of the car.');
  });

  it('should get resource (incl. enum)', async () => {
    // Status is an enum
    const query = /* GraphQL */ `
      {
        getUserByUsername(username: "arlene") {
          name
          status
        }
      }
    `;

    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });

    expect(result).toEqual({
      data: { getUserByUsername: { name: 'Arlene L McMahon', status: 'staff' } },
    });
  });

  it('Get resource 2', async () => {
    const query = /* GraphQL */ `
      {
        company(id: "binsol") {
          legalForm
        }
      }
    `;

    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });

    expect(result).toEqual({
      data: { company: { legalForm: 'public' } },
    });
  });

  // OAS allows you to define response objects with HTTP code with the XX wildcard syntax
  it('should get resource with status code: 2XX', async () => {
    const query = /* GraphQL */ `
      {
        getPapers {
          name
          published
        }
      }
    `;

    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });
    expect(result).toEqual({
      data: {
        getPapers: [
          { name: 'Deliciousness of apples', published: true },
          { name: 'How much coffee is too much coffee?', published: false },
          {
            name: 'How many tennis balls can fit into the average building?',
            published: true,
          },
        ],
      },
    });
  });

  /**
   * Some operations do not have a response body.
   */
  it('should get resource with no response schema and status code: 204', async () => {
    const query = /* GraphQL */ `
      {
        getBonuses
      }
    `;

    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });
    expect(result).toEqual({
      data: {
        getBonuses: '',
      },
    });
  });

  // Link objects in the OAS allow OtG to create nested GraphQL objects that resolve on different API calls
  it('should get nested resource via link $response.body#/...', async () => {
    const query = /* GraphQL */ `
      {
        getUserByUsername(username: "arlene") {
          name
          employerCompany {
            legalForm
          }
        }
      }
    `;
    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });
    expect(result).toEqual({
      data: {
        getUserByUsername: {
          name: 'Arlene L McMahon',
          employerCompany: {
            legalForm: 'public',
          },
        },
      },
    });
  });

  it('should get nested resource via link $request.path#/... and $request.query#/', async () => {
    const query = /* GraphQL */ `
      {
        get_product_with_id(product_id: "123", input: { product_tag: "blah" }) {
          product_name
          reviews {
            text
          }
        }
      }
    `;
    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });
    expect(result).toEqual({
      data: {
        get_product_with_id: {
          product_name: 'Super Product',
          reviews: [{ text: 'Great product' }, { text: 'I love it' }],
        },
      },
    });
  });

  // Both an operationId and an operationRef can be used to create a link object
  it('should get nested resource via link operationRef', async () => {
    const query = /* GraphQL */ `
      {
        get_product_with_id(product_id: "123", input: { product_tag: "blah" }) {
          product_name
          reviewsWithOperationRef {
            text
          }
        }
      }
    `;
    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });
    expect(result).toEqual({
      data: {
        get_product_with_id: {
          product_name: 'Super Product',
          reviewsWithOperationRef: [{ text: 'Great product' }, { text: 'I love it' }],
        },
      },
    });
  });

  it('should get nested lists of resources', async () => {
    const query = /* GraphQL */ `
      {
        getUserByUsername(username: "arlene") {
          name
          friends {
            name
            friends {
              name
              friends {
                name
              }
            }
          }
        }
      }
    `;
    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });
    expect(result).toEqual({
      data: {
        getUserByUsername: {
          name: 'Arlene L McMahon',
          friends: [
            {
              name: 'William B Ropp',
              friends: [
                {
                  name: 'William B Ropp',
                  friends: [
                    {
                      name: 'William B Ropp',
                    },
                    {
                      name: 'John C Barnes',
                    },
                    {
                      name: 'Heather J Tate',
                    },
                  ],
                },
                {
                  name: 'John C Barnes',
                  friends: [
                    {
                      name: 'William B Ropp',
                    },
                    {
                      name: 'John C Barnes',
                    },
                    {
                      name: 'Heather J Tate',
                    },
                  ],
                },
                {
                  name: 'Heather J Tate',
                  friends: [
                    {
                      name: 'William B Ropp',
                    },
                    {
                      name: 'John C Barnes',
                    },
                    {
                      name: 'Heather J Tate',
                    },
                  ],
                },
              ],
            },
            {
              name: 'John C Barnes',
              friends: [
                {
                  name: 'William B Ropp',
                  friends: [
                    {
                      name: 'William B Ropp',
                    },
                    {
                      name: 'John C Barnes',
                    },
                    {
                      name: 'Heather J Tate',
                    },
                  ],
                },
                {
                  name: 'John C Barnes',
                  friends: [
                    {
                      name: 'William B Ropp',
                    },
                    {
                      name: 'John C Barnes',
                    },
                    {
                      name: 'Heather J Tate',
                    },
                  ],
                },
                {
                  name: 'Heather J Tate',
                  friends: [
                    {
                      name: 'William B Ropp',
                    },
                    {
                      name: 'John C Barnes',
                    },
                    {
                      name: 'Heather J Tate',
                    },
                  ],
                },
              ],
            },
            {
              name: 'Heather J Tate',
              friends: [
                {
                  name: 'William B Ropp',
                  friends: [
                    {
                      name: 'William B Ropp',
                    },
                    {
                      name: 'John C Barnes',
                    },
                    {
                      name: 'Heather J Tate',
                    },
                  ],
                },
                {
                  name: 'John C Barnes',
                  friends: [
                    {
                      name: 'William B Ropp',
                    },
                    {
                      name: 'John C Barnes',
                    },
                    {
                      name: 'Heather J Tate',
                    },
                  ],
                },
                {
                  name: 'Heather J Tate',
                  friends: [
                    {
                      name: 'William B Ropp',
                    },
                    {
                      name: 'John C Barnes',
                    },
                    {
                      name: 'Heather J Tate',
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    });
  });

  it('should get nested lists of resources without specifying a path param for the parent resource', async () => {
    const query = /* GraphQL */ `
      {
        getUsers(input: { limit: 1 }) {
          name
          friends {
            name
            friends {
              name
              friends {
                name
              }
            }
          }
        }
      }
    `;
    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });

    expect(result).toEqual({
      data: {
        getUsers: [
          {
            name: 'Arlene L McMahon',
            friends: [
              {
                name: 'William B Ropp',
                friends: [
                  {
                    name: 'William B Ropp',
                    friends: [
                      {
                        name: 'William B Ropp',
                      },
                      {
                        name: 'John C Barnes',
                      },
                      {
                        name: 'Heather J Tate',
                      },
                    ],
                  },
                  {
                    name: 'John C Barnes',
                    friends: [
                      {
                        name: 'William B Ropp',
                      },
                      {
                        name: 'John C Barnes',
                      },
                      {
                        name: 'Heather J Tate',
                      },
                    ],
                  },
                  {
                    name: 'Heather J Tate',
                    friends: [
                      {
                        name: 'William B Ropp',
                      },
                      {
                        name: 'John C Barnes',
                      },
                      {
                        name: 'Heather J Tate',
                      },
                    ],
                  },
                ],
              },
              {
                name: 'John C Barnes',
                friends: [
                  {
                    name: 'William B Ropp',
                    friends: [
                      {
                        name: 'William B Ropp',
                      },
                      {
                        name: 'John C Barnes',
                      },
                      {
                        name: 'Heather J Tate',
                      },
                    ],
                  },
                  {
                    name: 'John C Barnes',
                    friends: [
                      {
                        name: 'William B Ropp',
                      },
                      {
                        name: 'John C Barnes',
                      },
                      {
                        name: 'Heather J Tate',
                      },
                    ],
                  },
                  {
                    name: 'Heather J Tate',
                    friends: [
                      {
                        name: 'William B Ropp',
                      },
                      {
                        name: 'John C Barnes',
                      },
                      {
                        name: 'Heather J Tate',
                      },
                    ],
                  },
                ],
              },
              {
                name: 'Heather J Tate',
                friends: [
                  {
                    name: 'William B Ropp',
                    friends: [
                      {
                        name: 'William B Ropp',
                      },
                      {
                        name: 'John C Barnes',
                      },
                      {
                        name: 'Heather J Tate',
                      },
                    ],
                  },
                  {
                    name: 'John C Barnes',
                    friends: [
                      {
                        name: 'William B Ropp',
                      },
                      {
                        name: 'John C Barnes',
                      },
                      {
                        name: 'Heather J Tate',
                      },
                    ],
                  },
                  {
                    name: 'Heather J Tate',
                    friends: [
                      {
                        name: 'William B Ropp',
                      },
                      {
                        name: 'John C Barnes',
                      },
                      {
                        name: 'Heather J Tate',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    });
  });
  it('should generate the schema correctly', () => {
    expect(printSchemaWithDirectives(createdSchema)).toMatchSnapshot();
  });
});
