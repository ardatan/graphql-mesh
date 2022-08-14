import { execute, graphql, GraphQLInputObjectType, GraphQLObjectType, GraphQLSchema, parse, validate } from 'graphql';
import 'json-bigint-patch';
import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI';

import { startServer, stopServer } from '../../../handlers/openapi/test/example_api_server';
import { fetch } from '@whatwg-node/fetch';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { OpenAPILoaderOptions } from '../src';

let createdSchema: GraphQLSchema;
const PORT = 3002;
const baseUrl = `http://localhost:${PORT}/api`;

jest.setTimeout(9999990);

describe('example_api', () => {
  beforeAll(async () => {
    createdSchema = await loadGraphQLSchemaFromOpenAPI('test', {
      fetch,
      baseUrl,
      oasFilePath: '../../../handlers/openapi/test/fixtures/example_oas.json',
      cwd: __dirname,
    });
    await startServer(PORT);
  });
  afterAll(() => stopServer());

  it('should generate the schema correctly', () => {
    expect(printSchemaWithDirectives(createdSchema)).toMatchSnapshot();
  });

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
        getCompanyById(id: "binsol") {
          legalForm
        }
      }
    `;

    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });

    expect(result).toEqual({
      data: { getCompanyById: { legalForm: 'public' } },
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

  // Links can be defined with some parameters as constants or variables
  it('Link parameters as constants and variables', async () => {
    const query = /* GraphQL */ `
      {
        getScanner(input: { query: "hello" }) {
          body
          basicLink {
            body
          }
          variableLink {
            body
          }
          constantLink {
            body
          }
          everythingLink {
            body
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
        getScanner: {
          body: 'hello',
          basicLink: {
            body: 'hello',
          },
          variableLink: {
            body: '_hello_hellohelloabchello123',
          },
          constantLink: {
            body: '123',
          },
          everythingLink: {
            body: 'http://localhost:3002/api/scanner_GET_200_hello_application/json_keep-alive',
          },
        },
      },
    });
  });

  it('Nested links with constants and variables', async () => {
    const query = /* GraphQL */ `
      {
        getScanner(input: { query: "val" }) {
          body
          basicLink {
            body
            basicLink {
              body
              basicLink {
                body
              }
            }
          }
          variableLink {
            body
            constantLink {
              body
              everythingLink {
                body
                everythingLink {
                  body
                }
              }
            }
          }
          constantLink {
            body
          }
          everythingLink {
            body
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
        getScanner: {
          body: 'val',
          basicLink: {
            body: 'val',
            basicLink: {
              body: 'val',
              basicLink: {
                body: 'val',
              },
            },
          },
          variableLink: {
            body: '_val_valvalabcval123',
            constantLink: {
              body: '123',
              everythingLink: {
                body: 'http://localhost:3002/api/copier_GET_200_123_application/json_keep-alive',
                everythingLink: {
                  body: 'http://localhost:3002/api/copier_GET_200_http://localhost:3002/api/copier_GET_200_123_application/json_keep-alive_application/json_keep-alive',
                },
              },
            },
          },
          constantLink: {
            body: '123',
          },
          everythingLink: {
            body: 'http://localhost:3002/api/scanner_GET_200_val_application/json_keep-alive',
          },
        },
      },
    });
  });

  it('Link parameters as constants and variables with request payload', async () => {
    const query = /* GraphQL */ `
      mutation {
        postScanner(query: "query", path: "path", input: "body") {
          body
          everythingLink2 {
            body
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
        postScanner: {
          body: 'req.body: body, req.query.query: query, req.path.path: path',
          everythingLink2: {
            body: 'http://localhost:3002/api/scanner/path_POST_200_body_query_path_application/json_req.body: body, req.query.query: query, req.path.path: path_query_path_keep-alive',
          },
        },
      },
    });
  });

  it('Get response for users with providing correct parameter', async () => {
    const query = /* GraphQL */ `
      {
        getUsers(input: { limit: 2 }) {
          name
        }
      }
    `;

    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });

    expect(result).toEqual({
      data: {
        getUsers: [{ name: 'Arlene L McMahon' }, { name: 'William B Ropp' }],
      },
    });
  });

  it('Get response with providing parameter with falsy value', async () => {
    const query = /* GraphQL */ `
      {
        getUsers(input: { limit: 0 }) {
          name
        }
      }
    `;

    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });

    expect(result).toEqual({
      data: {
        getUsers: [],
      },
    });
  });

  it('Get response without providing parameter with default value', async () => {
    // NOTE: product_tag was missing in the original handler, but here it fails without it. is it a bug?
    const query = /* GraphQL */ `
      {
        getProductReviews(id: "100", input: { product_tag: "" }) {
          text
        }
      }
    `;

    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });

    expect(result).toEqual({
      data: {
        getProductReviews: [{ text: 'Great product' }, { text: 'I love it' }],
      },
    });
  });

  it('Get response with header parameters', async () => {
    const query = /* GraphQL */ `
      {
        getSnack(snack_type: "CHIPS", snack_size: "SMALL")
      }
    `;

    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });

    expect(result).toEqual({
      data: {
        getSnack: 'Here is a SMALL CHIPS',
      },
    });
  });

  /**
   * Content-type and accept headers should not change because they are
   * linked to GraphQL object types with static schemas
   */
  it('Get JSON response even with non-JSON accept header', async () => {
    const query = /* GraphQL */ `
      {
        getOffice(id: 2) {
          employerId
          room_number
        }
      }
    `;

    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });

    expect(result).toEqual({
      data: {
        getOffice: {
          employerId: 'binsol',
          room_number: 102,
        },
      },
    });
  });

  it('Get response with cookies', async () => {
    const query = /* GraphQL */ `
      {
        getCookie(cookie_type: "CHOCOLATE_CHIP", cookie_size: "MEGA_SIZED")
      }
    `;

    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });

    expect(result).toEqual({
      data: {
        getCookie: 'Thanks for your cookie preferences: "cookie_type=CHOCOLATE_CHIP; cookie_size=MEGA_SIZED;"',
      },
    });
  });

  /**
   * GraphQL (input) object type also consider the preferred name when generating
   * a name
   */
  it('Ensure good naming for operations with duplicated schemas', async () => {
    const query = /* GraphQL */ `
      query {
        getNumberOfCleanDesks
        getNumberOfDirtyDesks
      }
    `;

    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });

    expect(result).toEqual({
      data: {
        getNumberOfCleanDesks: '5 clean desks',
        getNumberOfDirtyDesks: '5 dirty desks',
      },
    });
  });

  /**
   * CASE: 64 bit int - return number instead of integer, leading to use of
   * GraphQLFloat, which can support 64 bits:
   */
  it('Get response containing 64-bit integer (using GraphQLBigInt)', async () => {
    const query = /* GraphQL */ `
      {
        getProductReviews(id: "100", input: { product_tag: "blah" }) {
          timestamp
        }
      }
    `;

    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });

    expect(result).toEqual({
      data: {
        getProductReviews: [{ timestamp: BigInt(1502787600000000) }, { timestamp: BigInt(1502787400000000) }],
      },
    });
  });

  it('Get array of strings', async () => {
    const query = /* GraphQL */ `
      {
        getUserByUsername(username: "arlene") {
          hobbies
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
          hobbies: ['tap dancing', 'bowling'],
        },
      },
    });
  });

  it('Get array of objects', async () => {
    const query = /* GraphQL */ `
      {
        getCompanyById(id: "binsol") {
          offices {
            street
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
        getCompanyById: {
          offices: [
            {
              street: '122 Elk Rd Little',
            },
            {
              street: '124 Elk Rd Little',
            },
          ],
        },
      },
    });
  });

  it('Get single resource', async () => {
    const query = /* GraphQL */ `
      {
        getUserByUsername(username: "arlene") {
          name
          address {
            street
          }
          address2 {
            city
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
          address: {
            street: '4656 Cherry Camp Road',
          },
          address2: {
            city: 'Macomb',
          },
        },
      },
    });
  });

  it('Post resource', async () => {
    const query = /* GraphQL */ `
      mutation {
        postUser(
          input: {
            name: "Mr. New Guy"
            address: { street: "Home streeet 1", city: "Hamburg" }
            employerId: "binsol"
            hobbies: "soccer"
          }
        ) {
          name
        }
      }
    `;

    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });

    expect(result).toEqual({
      data: {
        postUser: {
          name: 'Mr. New Guy',
        },
      },
    });
  });

  it('Post resource and get nested resource back', async () => {
    const query = /* GraphQL */ `
      mutation {
        postUser(
          input: {
            name: "Mr. New Guy"
            address: { street: "Home streeet 1", city: "Hamburg" }
            employerId: "binsol"
            hobbies: "soccer"
          }
        ) {
          name
          employerCompany {
            ceoUser {
              name
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
        postUser: {
          name: 'Mr. New Guy',
          employerCompany: {
            ceoUser: {
              name: 'John C Barnes',
            },
          },
        },
      },
    });
  });

  it('Post resource with non-application/json content-type request and response bodies', async () => {
    const query = /* GraphQL */ `
      mutation {
        postPaper(input: "happy")
      }
    `;

    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });

    expect(result).toEqual({
      data: {
        postPaper: 'You sent the paper idea: happy',
      },
    });
  });

  it(
    'Operation id is correctly sanitized, schema names and fields are ' +
      'correctly sanitized, path and query parameters are correctly sanitized, ' +
      'received data is correctly sanitized',
    async () => {
      const query = /* GraphQL */ `
        {
          get_product_with_id(product_id: "this-path", input: { product_tag: "And a tag" }) {
            product_id
            product_tag
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
            product_id: 'this-path',
            product_tag: 'And a tag',
          },
        },
      });
    }
  );

  it('Request data is correctly de-sanitized to be sent', async () => {
    const query = /* GraphQL */ `
      mutation {
        post_product_with_id(input: { product_name: "Soccer ball", product_id: "ball123", product_tag: "sports" }) {
          product_name
          product_id
          product_tag
        }
      }
    `;

    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });

    expect(result).toEqual({
      data: {
        post_product_with_id: {
          product_name: 'Soccer ball',
          product_id: 'ball123',
          product_tag: 'sports',
        },
      },
    });
  });

  it('Fields with arbitrary JSON (e.g., maps) can be returned', async () => {
    // Testing additionalProperties field in schemas
    const query1 = /* GraphQL */ `
      {
        getAllCars {
          tags
        }
      }
    `;

    // Testing empty properties field
    const query2 = /* GraphQL */ `
      {
        getAllCars {
          features
        }
      }
    `;

    const [result1, result2] = await Promise.all(
      [query1, query2].map(query =>
        execute({
          schema: createdSchema,
          document: parse(query),
        })
      )
    );

    expect(result1).toEqual({
      data: {
        getAllCars: [
          {
            tags: null,
          },
          {
            tags: {
              speed: 'extreme',
            },
          },
          {
            tags: {
              impression: 'decadent',
              condition: 'slightly beat-up',
            },
          },
          {
            tags: {
              impression: 'decadent',
            },
          },
        ],
      },
    });

    expect(result2).toEqual({
      data: {
        getAllCars: [
          {
            features: {
              color: 'banana yellow to be specific',
            },
          },
          {
            features: null,
          },
          {
            features: null,
          },
          {
            features: null,
          },
        ],
      },
    });
  });

  it('Capitalized enum values can be returned', async () => {
    const query = /* GraphQL */ `
      {
        getUserCar(username: "arlene") {
          kind
        }
      }
    `;

    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });

    expect(result).toEqual({
      data: {
        getUserCar: {
          kind: 'SEDAN',
        },
      },
    });
  });

  it('Define header and query options', async () => {
    const options: OpenAPILoaderOptions = {
      baseUrl,
      oasFilePath: '../../../handlers/openapi/test/fixtures/example_oas.json',
      cwd: __dirname,
      fetch,
      operationHeaders: {
        exampleHeader: 'some-value',
      },
      queryParams: {
        limit: '30',
      },
    };

    const schema = await loadGraphQLSchemaFromOpenAPI('test', options);

    const query = /* GraphQL */ `
      {
        get_Status(input: { globalquery: "test" })
      }
    `;

    // validate that 'limit' parameter is covered by options:
    const ast = parse(query);
    const errors = validate(schema, ast);
    expect(errors).toEqual([]);

    const result = await graphql({ schema, source: query });
    expect(result).toEqual({
      data: {
        get_Status: 'Ok',
      },
    });
  });

  it('Resolve simple allOf', async () => {
    const query = /* GraphQL */ `
      {
        getUserByUsername(username: "arlene") {
          name
          nomenclature {
            genus
            species
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
          nomenclature: {
            genus: 'Homo',
            species: 'sapiens',
          },
        },
      },
    });
  });

  // The $ref is contained in the suborder field
  it('Resolve ref in allOf', async () => {
    const query = /* GraphQL */ `
      {
        getUserByUsername(username: "arlene") {
          name
          nomenclature {
            suborder
            genus
            species
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
          nomenclature: {
            suborder: 'Haplorhini',
            genus: 'Homo',
            species: 'sapiens',
          },
        },
      },
    });
  });

  // The nested allOf is contained in the family field
  it('Resolve nested allOf', async () => {
    const query = /* GraphQL */ `
      {
        getUserByUsername(username: "arlene") {
          name
          nomenclature {
            family
            genus
            species
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
          nomenclature: {
            family: 'Hominidae',
            genus: 'Homo',
            species: 'sapiens',
          },
        },
      },
    });
  });

  // The circular nested allOf is contained in the familyCircular field
  it('Resolve circular allOf', async () => {
    const query = /* GraphQL */ `
      {
        __type(name: "familyObject") {
          fields {
            name
            type {
              name
            }
          }
        }
      }
    `;

    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });

    // NOTE: is there better type to replace the "any"?
    expect(
      (result.data.__type as any).fields.find((field: { name: string }) => {
        return field.name === 'familyCircular';
      })
    ).toEqual({
      name: 'familyCircular',
      type: {
        name: 'familyObject',
      },
    });
  });

  it('Resolve oneOf, which becomes a union type', async () => {
    const query = /* GraphQL */ `
      {
        __type(name: "query_getAllAssets_items") {
          kind
          possibleTypes {
            name
            description
          }
        }
      }
    `;

    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });

    type carType = {
      name: string;
      description: string;
    };

    // Sort result because the order of the possibleTypes can change depending on Node version
    const possibleTypes = (result.data.__type as any).possibleTypes as carType[];
    possibleTypes.sort((a, b) => {
      return a.name.localeCompare(b.name);
    });

    expect(result).toEqual({
      data: {
        __type: {
          kind: 'UNION',
          possibleTypes: [
            {
              name: 'car',
              description: 'A car',
            },
            {
              name: 'trashcan',
              description: null,
            },
            {
              name: 'user',
              description: 'A user represents a natural person',
            },
          ],
        },
      },
    });
  });

  it('Union type', async () => {
    // NOTE: this doesn't work. probably UNION issue
    const query = /* GraphQL */ `
      {
        getAllAssets(companyId: "binsol") {
          ... on user {
            name
            address {
              city
            }
          }
          ... on trashcan {
            contents
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
        getAllAssets: [
          {
            name: 'Arlene L McMahon',
            address: {
              city: 'Elk Grove Village',
            },
          },
          {},
          {
            contents: [
              {
                type: 'apple',
                message: 'Half-eaten',
              },
              {
                type: 'sock',
                message: 'Lost one',
              },
            ],
          },
          {
            name: 'William B Ropp',
            address: {
              city: 'Macomb',
            },
          },
          {},
          {
            contents: [
              {
                type: 'sock',
                message: 'Lost one',
              },
            ],
          },
          {
            name: 'John C Barnes',
            address: {
              city: 'Tucson',
            },
          },
          {},
          {
            contents: [],
          },
        ],
      },
    });
  });

  // Extensions provide more information about failed API calls
  it('Error contains extension', async () => {
    // NOTE: error object is a bit different. should we adjust to match the prev structure?
    const query = /* GraphQL */ `
      query {
        getUserByUsername(username: "abcdef") {
          name
        }
      }
    `;

    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });

    const extensions = result.errors[0].extensions;
    expect(extensions).toBeDefined();

    // Remove headers because it contains fields that may change from run to run
    delete extensions.responseHeaders;
    expect(extensions).toEqual({
      method: 'GET',
      url: 'http://localhost:3002/api/users/abcdef',
      statusCode: 404,
      statusText: 'Not Found',
      responseBody: {
        message: 'Wrong username',
      },
    });
  });

  // it('Option addLimitArgument', async () => {
  //   const options: Options<any, any, any> = {
  //     addLimitArgument: true,
  //     fetch,
  //   };

  //   const query = /* GraphQL */ `query {
  //     user(username: "arlene") {
  //       name
  //       friends (limit: 3) {
  //         name
  //         friends (limit: 2) {
  //           name
  //           friends (limit: 1) {
  //             name
  //           }
  //         }
  //       }
  //     }
  //   }`;

  //   return openAPIToGraphQL.createGraphQLSchema(oas, options).then(({ schema }) => {
  //     const ast = parse(query);
  //     const errors = validate(schema, ast);
  //     expect(errors).toEqual([]);
  //     return graphql({ schema, source: query }).then((result: any) => {
  //       expect(result).toEqual({
  //         data: {
  //           user: {
  //             name: 'Arlene L McMahon',
  //             friends: [
  //               {
  //                 name: 'William B Ropp',
  //                 friends: [
  //                   {
  //                     name: 'William B Ropp',
  //                     friends: [
  //                       {
  //                         name: 'William B Ropp',
  //                       },
  //                     ],
  //                   },
  //                   {
  //                     name: 'John C Barnes',
  //                     friends: [
  //                       {
  //                         name: 'William B Ropp',
  //                       },
  //                     ],
  //                   },
  //                 ],
  //               },
  //               {
  //                 name: 'John C Barnes',
  //                 friends: [
  //                   {
  //                     name: 'William B Ropp',
  //                     friends: [
  //                       {
  //                         name: 'William B Ropp',
  //                       },
  //                     ],
  //                   },
  //                   {
  //                     name: 'John C Barnes',
  //                     friends: [
  //                       {
  //                         name: 'William B Ropp',
  //                       },
  //                     ],
  //                   },
  //                 ],
  //               },
  //               {
  //                 name: 'Heather J Tate',
  //                 friends: [
  //                   {
  //                     name: 'William B Ropp',
  //                     friends: [
  //                       {
  //                         name: 'William B Ropp',
  //                       },
  //                     ],
  //                   },
  //                   {
  //                     name: 'John C Barnes',
  //                     friends: [
  //                       {
  //                         name: 'William B Ropp',
  //                       },
  //                     ],
  //                   },
  //                 ],
  //               },
  //             ],
  //           },
  //         },
  //       });
  //     });
  // });

  it('Content property in parameter object', async () => {
    const query = /* GraphQL */ `
      {
        getNearestCoffeeMachine(input: { lat: 3, long: 5 }) {
          lat
          long
        }
      }
    `;

    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });

    expect(result).toEqual({
      data: {
        getNearestCoffeeMachine: {
          lat: 8,
          long: 10,
        },
      },
    });
  });

  it('Handle objects without defined properties with arbitrary GraphQL JSON type', async () => {
    const query = /* GraphQL */ `
      {
        getOfficeTrashCan(username: "arlene") {
          contents
        }
        getAllTrashCans {
          contents
        }
      }
    `;

    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });

    expect(result).toEqual({
      data: {
        getOfficeTrashCan: {
          contents: [
            {
              type: 'apple',
              message: 'Half-eaten',
            },
            {
              type: 'sock',
              message: 'Lost one',
            },
          ],
        },
        getAllTrashCans: [
          {
            contents: [
              {
                type: 'apple',
                message: 'Half-eaten',
              },
              {
                type: 'sock',
                message: 'Lost one',
              },
            ],
          },
          {
            contents: [
              {
                type: 'sock',
                message: 'Lost one',
              },
            ],
          },
          {
            contents: [],
          },
          {
            contents: [
              {
                type: 'tissue',
                message: 'Used',
              },
            ],
          },
        ],
      },
    });
  });

  it('Throw on unparsable strings value for GraphQL JSON type objects', async () => {
    const query = /* GraphQL */ `
      {
        getOfficeTrashCan(username: "arlene") {
          brand
        }
      }
    `;

    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });

    const errorMessage = result.errors[0].message;
    expect(errorMessage).toEqual("'Garbage Emporium' is not valid!");
  });

  it('Handle input objects without defined properties with arbitrary GraphQL JSON type', async () => {
    const query = /* GraphQL */ `
      mutation {
        postOfficeTrashCan(input: { type: "sandwich", message: "moldy", tasteRating: 0 }, username: "arlene") {
          # brand
          contents
        }
      }
    `;

    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });

    expect(result).toEqual({
      data: {
        postOfficeTrashCan: {
          contents: [
            {
              type: 'apple',
              message: 'Half-eaten',
            },
            {
              type: 'sock',
              message: 'Lost one',
            },
            {
              type: 'sandwich',
              message: 'moldy',
              tasteRating: 0,
            },
          ],
        },
      },
    });
  });

  it('Throw on unparsable strings value for GraphQL JSON type input', async () => {
    const query = /* GraphQL */ `
      mutation {
        postOfficeTrashCan(input: { type: "sandwich", message: "moldy", tasteRating: 0 }, username: "arlene") {
          brand
        }
      }
    `;

    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });

    const errorMessage = result.errors[0].message;
    expect(errorMessage).toBeDefined();
  });

  it('UUID format becomes GraphQL UUID type', async () => {
    const query = /* GraphQL */ `
      {
        __type(name: "company") {
          fields {
            name
            type {
              name
              kind
            }
          }
        }
      }
    `;

    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });

    expect(
      (result.data.__type as any).fields.find((field: { name: string }) => {
        return field.name === 'id';
      })
    ).toEqual({
      name: 'id',
      type: {
        name: 'UUID',
        kind: 'SCALAR',
      },
    });
  });

  // it('Option idFormats', async () => {
  //   // NOTE: This test requires feature currently missing in this handler
  //   const query = /* GraphQL */ `{
  //     __type(name: "patent_with_id") {
  //       fields {
  //         name
  //         type {
  //           kind
  //           ofType {
  //             name
  //             kind
  //           }
  //         }
  //       }
  //     }
  //   }`;

  //   const ast = parse(query);
  //   const errors = validate(createdSchema, ast);
  //   expect(errors).toEqual([]);

  //   const result = await execute({
  //     schema: createdSchema,
  //     document: parse(query),
  //   });

  //   expect(
  //     (result.data.__type as any).fields.find((field: { name: string }) => {
  //       return field.name === 'patent_id';
  //     })
  //   ).toEqual({
  //     name: 'patent_id',
  //     type: {
  //       kind: 'NON_NULL',
  //       ofType: {
  //         name: 'UUID',
  //         kind: 'SCALAR',
  //       },
  //     },
  //   });
  // });

  it('Required properties for input object types', async () => {
    const userInputType = createdSchema.getType('user_Input') as GraphQLInputObjectType;

    // The exclamation mark shows that it is a required (non-nullable) property
    expect(userInputType.toConfig().fields.address.type.toString()).toEqual('address_Input!');
    expect(userInputType.toConfig().fields.address2.type.toString()).toEqual('address_Input');
  });

  // it('Option selectQueryOrMutationField', async () => {
  //   const query = /* GraphQL */ `{
  //     __schema {
  //       queryType {
  //         fields {
  //           name
  //           description
  //         }
  //       }
  //       mutationType {
  //         fields {
  //           name
  //           description
  //         }
  //       }
  //     }
  //   }`;

  //   // TgetUe users field should exist as a Query field
  //   const promise = graphql({ schema: createdSchema, source: query }).then((result: any) => {
  //     expect(
  //       result.data.__schema.queryType.fields.find((field: { name: string }) => {
  //         return field.name === 'user';
  //       })
  //     ).toEqual({
  //       name: 'user',
  //       description: 'Returns a user from the system.\n\nEquivalent to GET /users/{username}',
  //     });

  //     expect(
  //       result.data.__schema.mutationType.fields.find((field: { name: string }) => {
  //         return field.name === 'user';
  //       })
  //     ).toEqual(undefined);
  //   });

  //   const options: Options<any, any, any> = {
  //     selectQueryOrMutationField: {
  //       'Example API': {
  //         '/users/{username}': {
  //           get: GraphQLOperationType.Mutation,
  //         },
  //       },
  //     },
  //     fetch,
  //   };

  //   // The users (now named getUserByUsername) field should exist as a Mutation field
  //   const promise2 = openAPIToGraphQL.createGraphQLSchema(oas, options).then(({ schema }) => {
  //     const ast = parse(query);
  //     const errors = validate(schema, ast);
  //     expect(errors).toEqual([]);
  //     return graphql({ schema, source: query }).then((result: any) => {
  //       expect(
  //         result.data.__schema.queryType.fields.find((field: { name: string }) => {
  //           return field.name === 'getUserByUsername';
  //         })
  //       ).toEqual(undefined);

  //       expect(
  //         result.data.__schema.mutationType.fields.find((field: { name: string }) => {
  //           return field.name === 'getUserByUsername';
  //         })
  //       ).toEqual({
  //         name: 'getUserByUsername',
  //         description: 'Returns a user from the system.\n\nEquivalent to GET /users/{username}',
  //       });
  //     });
  //   });

  //   return Promise.all([promise, promise2]);
  // });

  // it('Header arguments are not created when they are provided through headers option', async () => {
  //   // The GET snack operation has a snack_type and snack_size header arguments
  //   const options: Options<any, any, any> = {
  //     headers: {
  //       snack_type: 'chips',
  //       snack_size: 'large',
  //     },
  //     fetch,
  //   };

  //   const query = /* GraphQL */ `{
  //     __schema {
  //       queryType {
  //         fields {
  //           name
  //           args {
  //             name
  //           }
  //         }
  //       }
  //     }
  //   }`;

  //   return openAPIToGraphQL.createGraphQLSchema(oas, options).then(({ schema }) => {
  //     const ast = parse(query);
  //     const errors = validate(schema, ast);
  //     expect(errors).toEqual([]);
  //     return graphql({ schema, source: query }).then((result: any) => {
  //       expect(
  //         result.data.__schema.queryType.fields.find((field: { name: string }) => {
  //           return field.name === 'snack';
  //         })
  //       ).toEqual({
  //         name: 'snack',
  //         args: [], // No arguments
  //       });
  //     });
  // });

  // it('Header arguments are not created when they are provided through requestOptions option', async () => {
  //   // The GET snack operation has a snack_type and snack_size header arguments
  //   const options: Options<any, any, any> = {
  //     requestOptions: {
  //       headers: {
  //         snack_type: 'chips',
  //         snack_size: 'large',
  //       },
  //     },
  //     fetch,
  //   };

  //   const query = /* GraphQL */ `{
  //     __schema {
  //       queryType {
  //         fields {
  //           name
  //           args {
  //             name
  //           }
  //         }
  //       }
  //     }
  //   }`;

  //   return openAPIToGraphQL.createGraphQLSchema(oas, options).then(({ schema }) => {
  //     const ast = parse(query);
  //     const errors = validate(schema, ast);
  //     expect(errors).toEqual([]);
  //     return graphql({ schema, source: query }).then((result: any) => {
  //       expect(
  //         result.data.__schema.queryType.fields.find((field: { name: string }) => {
  //           return field.name === 'snack';
  //         })
  //       ).toEqual({
  //         name: 'snack',
  //         args: [], // No arguments
  //       });
  //     });
  // });

  // it('Query string arguments are not created when they are provided through qs option', async () => {
  //   // The GET status operation has a limit query string parameter
  //   const options: Options<any, any, any> = {
  //     qs: {
  //       limit: '10',
  //     },
  //     fetch,
  //   };

  //   const query = /* GraphQL */ `{
  //     __schema {
  //       queryType {
  //         fields {
  //           name
  //           args {
  //             name
  //           }
  //         }
  //       }
  //     }
  //   }`;

  //   return openAPIToGraphQL.createGraphQLSchema(oas, options).then(({ schema }) => {
  //     const ast = parse(query);
  //     const errors = validate(schema, ast);
  //     expect(errors).toEqual([]);
  //     return graphql({ schema, source: query }).then((result: any) => {
  //       expect(
  //         result.data.__schema.queryType.fields.find((field: { name: string }) => {
  //           return field.name === 'users';
  //         })
  //       ).toEqual({
  //         name: 'users',
  //         args: [], // No arguments
  //       });
  //     });
  // });

  // it('Non-nullable properties for object types', async () => {
  //   const coordinates = createdSchema.getType('Coordinates') as GraphQLObjectType;

  //   // The exclamation mark shows that it is a required (non-nullable) property
  //   expect(coordinates.toConfig().fields.lat.type.toString()).toEqual('Float!');
  //   expect(coordinates.toConfig().fields.long.type.toString()).toEqual('Float!');
  // });

  // it('Option genericPayloadArgName', async () => {
  //   const query = /* GraphQL */ `{
  //     __schema {
  //       mutationType {
  //         fields {
  //           name
  //           args {
  //             name
  //           }
  //         }
  //       }
  //     }
  //   }`;

  //   // The postUser field should have a userInput argument
  //   const promise = graphql({ schema: createdSchema, source: query }).then((result: any) => {
  //     expect(
  //       result.data.__schema.mutationType.fields.find((field: { name: string }) => {
  //         return field.name === 'postUser';
  //       })
  //     ).toEqual({
  //       name: 'postUser',
  //       args: [
  //         {
  //           name: 'userInput',
  //         },
  //       ],
  //     });
  //   });

  //   const options: Options<any, any, any> = {
  //     genericPayloadArgName: true,
  //     fetch,
  //   };

  //   // The postUser field should now have a requestPody argument
  //   const promise2 = openAPIToGraphQL.createGraphQLSchema(oas, options).then(({ schema }) => {
  //     const ast = parse(query);
  //     const errors = validate(schema, ast);
  //     expect(errors).toEqual([]);
  //     return graphql({ schema, source: query }).then((result: any) => {
  //       expect(
  //         result.data.__schema.mutationType.fields.find((field: { name: string }) => {
  //           return field.name === 'postUser';
  //         })
  //       ).toEqual({
  //         name: 'postUser',
  //         args: [
  //           {
  //             name: 'requestBody',
  //           },
  //         ],
  //       });
  //     });
  //   });

  //   return Promise.all([promise, promise2]);
  // });

  // it('Non-nullable properties from nested allOf', async () => {
  //   // Check query/mutation field descriptions
  //   const query = /* GraphQL */ `{
  //     __type(name: "Nomenclature") {
  //       fields {
  //         name
  //         type {
  //           kind
  //           ofType {
  //             name
  //             kind
  //           }
  //         }
  //       }
  //     }
  //   }`;

  //   return openAPIToGraphQL.createGraphQLSchema(oas, { fetch }).then(({ schema }) => {
  //     const ast = parse(query);
  //     const errors = validate(schema, ast);
  //     expect(errors).toEqual([]);
  //     return graphql({ schema, source: query }).then((result: any) => {
  //       expect(
  //         result.data.__type.fields.find((field: { name: string }) => {
  //           return field.name === 'family';
  //         })
  //       ).toEqual({
  //         name: 'family',
  //         type: {
  //           kind: 'NON_NULL',
  //           ofType: {
  //             name: 'String',
  //             kind: 'SCALAR',
  //           },
  //         },
  //       });
  //     });
  // });
});
