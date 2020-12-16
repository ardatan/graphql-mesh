/* eslint-disable no-extend-native */
/* eslint-disable camelcase */
// Copyright IBM Corp. 2017,2018. All Rights Reserved.
// Node module: openapi-to-graphql
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

/* globals beforeAll, test, expect */

import { graphql, parse, validate, GraphQLSchema, GraphQLInputObjectType, GraphQLObjectType } from 'graphql';

import * as openAPIToGraphQL from '../src/openapi-to-graphql/index';
import { Options } from '../src/openapi-to-graphql/types/options';
import { startServer, stopServer } from './example_api_server';
import { GraphQLOperationType } from '../src/openapi-to-graphql/types/graphql';
import fetch from 'cross-fetch';

const oas = require('./fixtures/example_oas.json');
const PORT = 3002;
// Update PORT for this test case:
oas.servers[0].variables.port.default = String(PORT);

let createdSchema: GraphQLSchema;

/**
 * Set up the schema first and run example API server
 */
beforeAll(() => {
  return Promise.all([
    openAPIToGraphQL
      .createGraphQLSchema(oas, {
        fillEmptyResponses: true,
        fetch,
      })
      .then(({ schema, report }) => {
        createdSchema = schema;
      }),
    startServer(PORT),
  ]);
});

/**
 * Shut down API server
 */
afterAll(() => {
  return stopServer();
});

test('Get descriptions', () => {
  // Get all the descriptions of the fields on the GraphQL object type Car
  const query = `{
    __type(name: "Car") {
      name
      fields {
        description
      }
    }
  }`;

  return graphql(createdSchema, query).then(result => {
    expect(result).toEqual({
      data: {
        __type: {
          name: 'Car',
          fields: [
            {
              description: 'The color of the car.',
            },
            {
              description: null,
            },
            {
              description: null,
            },
            {
              description: 'The model of the car.',
            },
            {
              description: 'The rating of the car.',
            },
            {
              description: 'Arbitrary (string) tags describing an entity.',
            },
          ],
        },
      },
    });
  });
});

test('Get resource (incl. enum)', () => {
  // Status is an enum
  const query = `{
    user (username: "arlene") {
      name
      status
    }
  }`;

  return graphql(createdSchema, query).then(result => {
    expect(result).toEqual({
      data: { user: { name: 'Arlene L McMahon', status: 'STAFF' } },
    });
  });
});

test('Get resource 2', () => {
  const query = `{
    company (id: "binsol") {
      legalForm
    }
  }`;

  return graphql(createdSchema, query).then(result => {
    expect(result).toEqual({ data: { company: { legalForm: 'public' } } });
  });
});

// OAS allows you to define response objects with HTTP code with the XX wildcard syntax
test('Get resource with status code: 2XX', () => {
  const query = `{
    papers {
      name
      published
    }
  }`;

  return graphql(createdSchema, query).then(result => {
    expect(result).toEqual({
      data: {
        papers: [
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
});

/**
 * Some operations do not have a response body. The option fillEmptyResponses
 * allows OtG to handle these cases.
 */
test('Get resource with no response schema and status code: 204 and fillEmptyResponses', () => {
  const query = `{
    bonuses
  }`;

  return graphql(createdSchema, query).then(result => {
    expect(result).toEqual({
      data: {
        bonuses: null,
      },
    });
  });
});

// Link objects in the OAS allow OtG to create nested GraphQL objects that resolve on different API calls
test('Get nested resource via link $response.body#/...', () => {
  const query = `{
    user (username: "arlene") {
      name
      employerCompany {
        legalForm
      }
    }
  }`;

  return graphql(createdSchema, query).then(result => {
    expect(result).toEqual({
      data: {
        user: {
          name: 'Arlene L McMahon',
          employerCompany: {
            legalForm: 'public',
          },
        },
      },
    });
  });
});

test('Get nested resource via link $request.path#/... and $request.query#/', () => {
  const query = `{
    productWithId (productId: "123" productTag: "blah") {
      productName
      reviews {
        text
      }
    }
  }`;

  return graphql(createdSchema, query).then(result => {
    expect(result).toEqual({
      data: {
        productWithId: {
          productName: 'Super Product',
          reviews: [{ text: 'Great product' }, { text: 'I love it' }],
        },
      },
    });
  });
});

// Both an operationId and an operationRef can be used to create a link object
test('Get nested resource via link operationRef', () => {
  const query = `{
    productWithId (productId: "123" productTag: "blah") {
      productName
      reviewsWithOperationRef {
        text
      }
    }
  }`;

  return graphql(createdSchema, query).then(result => {
    expect(result).toEqual({
      data: {
        productWithId: {
          productName: 'Super Product',
          reviewsWithOperationRef: [{ text: 'Great product' }, { text: 'I love it' }],
        },
      },
    });
  });
});

test('Get nested lists of resources', () => {
  const query = `{
    user(username: "arlene") {
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
  }`;

  return graphql(createdSchema, query).then(result => {
    expect(result).toEqual({
      data: {
        user: {
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
});

// Links can be defined with some parameters as constants or variables
test('Link parameters as constants and variables', () => {
  const query = `{
    scanner(query: "hello") {
      body
      basicLink{
        body
      }
      variableLink{
        body
      }
      constantLink{
        body
      }
      everythingLink{
        body
      }
    }
  }`;

  return graphql(createdSchema, query).then(result => {
    expect(result).toEqual({
      data: {
        scanner: {
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
            body: 'http://localhost:3002/api/scanner_get_200_hello_application/json_close',
          },
        },
      },
    });
  });
});

test('Nested links with constants and variables', () => {
  const query = `{
    scanner(query: "val") {
      body
      basicLink{
        body
        basicLink{
          body
          basicLink{
            body
          }
        }
      }
      variableLink{
        body
        constantLink{
          body
          everythingLink{
            body
            everythingLink{
              body
            }
          }
        }
      }
      constantLink{
        body
      }
      everythingLink{
        body
      }
    }
  }`;

  return graphql(createdSchema, query).then(result => {
    expect(result).toEqual({
      data: {
        scanner: {
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
                body: 'http://localhost:3002/api/copier_get_200_123_application/json_close',
                everythingLink: {
                  body:
                    'http://localhost:3002/api/copier_get_200_http://localhost:3002/api/copier_get_200_123_application/json_close_application/json_close',
                },
              },
            },
          },
          constantLink: {
            body: '123',
          },
          everythingLink: {
            body: 'http://localhost:3002/api/scanner_get_200_val_application/json_close',
          },
        },
      },
    });
  });
});

test('Link parameters as constants and variables with request payload', () => {
  const query = `mutation {
    postScanner(query: "query", path: "path", textPlain2Input: "body") {
      body
      everythingLink2 {
        body
      }
    }
  }`;

  return graphql(createdSchema, query).then(result => {
    expect(result).toEqual({
      data: {
        postScanner: {
          body: 'req.body: body, req.query.query: query, req.path.path: path',
          everythingLink2: {
            body:
              'http://localhost:3002/api/scanner/path_post_200_body_query_path_application/json_req.body: body, req.query.query: query, req.path.path: path_query_path_close',
          },
        },
      },
    });
  });
});

test('Get response without providing parameter with default value', () => {
  const query = `{
    productReviews (id: "100") {
      text
    }
  }`;

  return graphql(createdSchema, query).then(result => {
    expect(result).toEqual({
      data: {
        productReviews: [{ text: 'Great product' }, { text: 'I love it' }],
      },
    });
  });
});

test('Get response with header parameters', () => {
  const query = `{
    snack(snackType: CHIPS, snackSize: SMALL)
  }`;

  return graphql(createdSchema, query).then(result => {
    expect(result).toEqual({
      data: {
        snack: 'Here is a small chips',
      },
    });
  });
});

/**
 * Content-type and accept headers should not change because they are
 * linked to GraphQL object types with static schemas
 */
test('Get JSON response even with non-JSON accept header', () => {
  const query = `{
    office (id: 2) {
      employerId
      roomNumber,
    }
  }`;

  return graphql(createdSchema, query).then(result => {
    expect(result).toEqual({
      data: {
        office: {
          employerId: 'binsol',
          roomNumber: 102,
        },
      },
    });
  });
});

test('Get response with cookies', () => {
  const query = `{
    cookie (cookieType: CHOCOLATE_CHIP, cookieSize: MEGA_SIZED)
  }`;

  return graphql(createdSchema, query).then(result => {
    expect(result).toEqual({
      data: {
        cookie: 'Thanks for your cookie preferences: "cookie_type=chocolate chip; cookie_size=mega-sized;"',
      },
    });
  });
});

/**
 * GraphQL (input) object type also consider the preferred name when generating
 * a name
 */
test('Ensure good naming for operations with duplicated schemas', () => {
  const query = `query {
    cleanDesks
    dirtyDesks
  }`;

  return graphql(createdSchema, query).then(result => {
    expect(result).toEqual({
      data: {
        cleanDesks: '5 clean desks',
        dirtyDesks: '5 dirty desks',
      },
    });
  });
});

/**
 * CASE: 64 bit int - return number instead of integer, leading to use of
 * GraphQLFloat, which can support 64 bits:
 */
test('Get response containing 64-bit integer (using GraphQLBigInt)', async () => {
  const query = `{
    productReviews (id: "100") {
      timestamp
    }
  }`;

  const result = await graphql(createdSchema, query);
  expect(result).toEqual({
    data: {
      productReviews: [{ timestamp: 1502787600000000 }, { timestamp: 1502787400000000 }],
    },
  });
});

test('Get array of strings', () => {
  const query = `{
    user (username: "arlene") {
      hobbies
    }
  }`;

  return graphql(createdSchema, query).then(result => {
    expect(result).toEqual({
      data: {
        user: {
          hobbies: ['tap dancing', 'bowling'],
        },
      },
    });
  });
});

test('Get array of objects', () => {
  const query = `{
    company (id: "binsol") {
      offices{
        street
      }
    }
  }`;

  return graphql(createdSchema, query).then(result => {
    expect(result).toEqual({
      data: {
        company: {
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
});

test('Get single resource', () => {
  const query = `{
    user(username: "arlene"){
      name
      address{
        street
      },
      address2{
        city
      }
    }
  }`;

  return graphql(createdSchema, query).then(result => {
    expect(result).toEqual({
      data: {
        user: {
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
});

test('Post resource', () => {
  const query = `mutation {
    postUser (userInput: {
      name: "Mr. New Guy"
      address: {
        street: "Home streeet 1"
        city: "Hamburg"
      }
      employerId: "binsol"
      hobbies: "soccer"
    }) {
      name
    }
  }`;

  return graphql(createdSchema, query).then(result => {
    expect(result).toEqual({
      data: {
        postUser: {
          name: 'Mr. New Guy',
        },
      },
    });
  });
});

test('Post resource and get nested resource back', () => {
  const query = `mutation {
    postUser (userInput: {
      name: "Mr. New Guy"
      address: {
        street: "Home streeet 1"
        city: "Hamburg"
      }
      employerId: "binsol"
      hobbies: "soccer"
    }) {
      name
      employerCompany {
        ceoUser {
          name
        }
      }
    }
  }`;

  return graphql(createdSchema, query).then(result => {
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
});

test('Post resource with non-application/json content-type request and response bodies', () => {
  const query = `mutation {
    postPaper(textPlainInput: "happy")
  }`;
  return graphql(createdSchema, query).then(result => {
    expect(result).toEqual({
      data: {
        postPaper: 'You sent the paper idea: happy',
      },
    });
  });
});

test(
  'Operation id is correctly sanitized, schema names and fields are ' +
    'correctly sanitized, path and query parameters are correctly sanitized, ' +
    'received data is correctly sanitized',
  () => {
    const query = `{
      productWithId(productId: "this-path", productTag: "And a tag") {
        productId
        productTag
      }
    }`;

    return graphql(createdSchema, query).then(result => {
      expect(result).toEqual({
        data: {
          productWithId: {
            productId: 'this-path',
            productTag: 'And a tag',
          },
        },
      });
    });
  }
);

test('Request data is correctly de-sanitized to be sent', () => {
  const query = `mutation {
    postProductWithId (productWithIdInput: {
      productName: "Soccer ball"
      productId: "ball123"
      productTag:"sports"
    }) {
      productName
      productId
      productTag
    }
  }`;

  return graphql(createdSchema, query).then(result => {
    expect(result).toEqual({
      data: {
        postProductWithId: {
          productName: 'Soccer ball',
          productId: 'ball123',
          productTag: 'sports',
        },
      },
    });
  });
});

test('Fields with arbitrary JSON (e.g., maps) can be returned', () => {
  // Testing additionalProperties field in schemas
  const query = `{
    cars {
      tags
    }
  }`;

  // Testing empty properties field
  const query2 = `{
    cars {
      features
    }
  }`;

  const promise = graphql(createdSchema, query, null, {}).then(result => {
    expect(result).toEqual({
      data: {
        cars: [
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
  });

  const promise2 = graphql(createdSchema, query2, null, {}).then(result => {
    expect(result).toEqual({
      data: {
        cars: [
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

  return Promise.all([promise, promise2]);
});

test('Capitalized enum values can be returned', () => {
  const query = `{
    car (username: "arlene") {
      kind
    }
  }`;

  return graphql(createdSchema, query, null, {}).then(result => {
    expect(result).toEqual({
      data: {
        car: {
          kind: 'SEDAN',
        },
      },
    });
  });
});

test('Define header and query options', () => {
  const options: Options = {
    headers: {
      exampleHeader: 'some-value',
    },
    qs: {
      limit: '30',
    },
    fetch,
  };

  const query = `{
    status2 (globalquery: "test")
  }`;
  return openAPIToGraphQL.createGraphQLSchema(oas, options).then(({ schema }) => {
    // validate that 'limit' parameter is covered by options:
    const ast = parse(query);
    const errors = validate(schema, ast);
    expect(errors).toEqual([]);
    return graphql(schema, query).then(result => {
      expect(result).toEqual({
        data: {
          status2: 'Ok',
        },
      });
    });
  });
});

test('Resolve simple allOf', () => {
  const query = `{
    user (username: "arlene") {
      name
      nomenclature {
        genus
        species
      }
    }
  }`;

  return graphql(createdSchema, query, null, {}).then(result => {
    expect(result).toEqual({
      data: {
        user: {
          name: 'Arlene L McMahon',
          nomenclature: {
            genus: 'Homo',
            species: 'sapiens',
          },
        },
      },
    });
  });
});

// The $ref is contained in the suborder field
test('Resolve ref in allOf', () => {
  const query = `{
    user (username: "arlene") {
      name
      nomenclature {
        suborder
        genus
        species
      }
    }
  }`;

  return graphql(createdSchema, query, null, {}).then(result => {
    expect(result).toEqual({
      data: {
        user: {
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
});

// The nested allOf is contained in the family field
test('Resolve nested allOf', () => {
  const query = `{
    user (username: "arlene") {
      name
      nomenclature {
        family
        genus
        species
      }
    }
  }`;

  return graphql(createdSchema, query, null, {}).then(result => {
    expect(result).toEqual({
      data: {
        user: {
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
});

// The circular nested allOf is contained in the familyCircular field
test('Resolve circular allOf', () => {
  const query = `{
    __type(name: "FamilyObject") {
      fields {
        name
        type {
          name
        }
      }
    }
  }`;

  return graphql(createdSchema, query, null, {}).then(result => {
    expect(
      result.data.__type.fields.find((field: { name: string }) => {
        return field.name === 'familyCircular';
      })
    ).toEqual({
      name: 'familyCircular',
      type: {
        name: 'FamilyObject',
      },
    });
  });
});

test('Resolve oneOf, which becomes a union type', () => {
  const query = `{
    __type(name: "AssetListItem") {
      kind
      possibleTypes {
        name
        description
      }
    }
  }`;

  return graphql(createdSchema, query, null, {}).then(result => {
    type carType = {
      name: string;
      description: string;
    };

    // Sort result because the order of the possibleTypes can change depending on Node version
    const possibleTypes = result.data.__type.possibleTypes as carType[];
    possibleTypes.sort((a, b) => {
      return a.name.localeCompare(b.name);
    });

    expect(result).toEqual({
      data: {
        __type: {
          kind: 'UNION',
          possibleTypes: [
            {
              name: 'Car',
              description: 'A car',
            },
            {
              name: 'Trashcan',
              description: null,
            },
            {
              name: 'User',
              description: 'A user represents a natural person',
            },
          ],
        },
      },
    });
  });
});

test('Union type', () => {
  const query = `{
    asset(companyId: "binsol") {
      ... on User {
        name
        address {
          city
        }
      }
      ... on Trashcan {
        contents
      }
    }
  }`;

  return graphql(createdSchema, query, null, {}).then(result => {
    expect(result).toEqual({
      data: {
        asset: [
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
});

// Extensions provide more information about failed API calls
test('Error contains extension', () => {
  const query = `query {
    user(username: "abcdef") {
      name
    }
  }`;

  return graphql(createdSchema, query, null, {}).then(error => {
    const extensions = error.errors[0].extensions;
    expect(extensions).toBeDefined();

    // Remove headers because it contains fields that may change from run to run
    delete extensions.responseHeaders;
    expect(extensions).toEqual({
      method: 'get',
      path: '/users/{username}',
      statusCode: 404,
      statusText: 'Not Found',
      responseBody: {
        message: 'Wrong username',
      },
    });
  });
});

test('Option provideErrorExtensions should prevent error extensions from being created', () => {
  const options: Options = {
    provideErrorExtensions: false,
    fetch,
  };

  const query = `query {
    user(username: "abcdef") {
      name
    }
  }`;

  return openAPIToGraphQL.createGraphQLSchema(oas, options).then(({ schema }) => {
    const ast = parse(query);
    const errors = validate(schema, ast);
    expect(errors).toEqual([]);
    return graphql(schema, query).then(result => {
      expect(result).toEqual({
        errors: [
          {
            message: 'Could not invoke operation GET /users/{username}',
            locations: [
              {
                line: 2,
                column: 5,
              },
            ],
            path: ['user'],
          },
        ],
        data: {
          user: null,
        },
      });
    });
  });
});

test('Option customResolver', () => {
  const options: Options = {
    customResolvers: {
      'Example API': {
        '/users/{username}': {
          get: () => {
            return {
              name: 'Jenifer Aldric',
            };
          },
        },
      },
    },
    fetch,
  };

  const query = `query {
    user(username: "abcdef") {
      name
    }
  }`;

  return openAPIToGraphQL.createGraphQLSchema(oas, options).then(({ schema }) => {
    const ast = parse(query);
    const errors = validate(schema, ast);
    expect(errors).toEqual([]);
    return graphql(schema, query).then(result => {
      expect(result).toEqual({
        data: {
          user: {
            name: 'Jenifer Aldric',
          },
        },
      });
    });
  });
});

test('Option customResolver with links', () => {
  const options: Options = {
    customResolvers: {
      'Example API': {
        '/users/{username}': {
          get: () => {
            return {
              name: 'Jenifer Aldric',
              employerId: 'binsol',
            };
          },
        },
      },
    },
    fetch,
  };

  const query = `query {
    user(username: "abcdef") {
      name
      employerId
      employerCompany {
        name
        ceoUsername
        ceoUser {
          name
        }
      }
    }
  }`;

  return openAPIToGraphQL.createGraphQLSchema(oas, options).then(({ schema }) => {
    const ast = parse(query);
    const errors = validate(schema, ast);
    expect(errors).toEqual([]);
    return graphql(schema, query).then(result => {
      expect(result).toEqual({
        data: {
          user: {
            name: 'Jenifer Aldric',
            employerId: 'binsol',
            employerCompany: {
              name: 'Binary Solutions',
              ceoUsername: 'johnny',
              ceoUser: {
                name: 'Jenifer Aldric',
              },
            },
          },
        },
      });
    });
  });
});

test('Option customResolver using resolver arguments', () => {
  const options: Options = {
    customResolvers: {
      'Example API': {
        '/users/{username}': {
          get: (obj, args: any, context, info) => {
            return {
              name: args.username,
            };
          },
        },
      },
    },
    fetch,
  };

  const query = `query {
    user(username: "abcdef") {
      name
    }
  }`;

  return openAPIToGraphQL.createGraphQLSchema(oas, options).then(({ schema }) => {
    const ast = parse(query);
    const errors = validate(schema, ast);
    expect(errors).toEqual([]);
    return graphql(schema, query).then(result => {
      expect(result).toEqual({
        data: {
          user: {
            name: 'abcdef',
          },
        },
      });
    });
  });
});

test('Option customResolver using resolver arguments that are sanitized', () => {
  const options: Options = {
    customResolvers: {
      'Example API': {
        '/products/{product-id}': {
          get: (obj, args, context, info) => {
            return {
              // Note that the argument name is sanitized
              productName: 'abcdef',
            };
          },
        },
      },
    },
    fetch,
  };

  const query = `{
    productWithId (productId: "123" productTag: "blah") {
      productName
    }
  }`;

  return openAPIToGraphQL.createGraphQLSchema(oas, options).then(({ schema }) => {
    const ast = parse(query);
    const errors = validate(schema, ast);
    expect(errors).toEqual([]);
    return graphql(schema, query).then(result => {
      expect(result).toEqual({
        data: {
          productWithId: {
            productName: 'abcdef',
          },
        },
      });
    });
  });
});

test('Option addLimitArgument', () => {
  const options: Options = {
    addLimitArgument: true,
    fetch,
  };

  const query = `query {
    user(username: "arlene") {
      name
      friends (limit: 3) {
        name
        friends (limit: 2) {
          name
          friends (limit: 1) {
            name
          }
        }
      }
    }
  }`;

  return openAPIToGraphQL.createGraphQLSchema(oas, options).then(({ schema }) => {
    const ast = parse(query);
    const errors = validate(schema, ast);
    expect(errors).toEqual([]);
    return graphql(schema, query).then(result => {
      expect(result).toEqual({
        data: {
          user: {
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
                    ],
                  },
                  {
                    name: 'John C Barnes',
                    friends: [
                      {
                        name: 'William B Ropp',
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
                    ],
                  },
                  {
                    name: 'John C Barnes',
                    friends: [
                      {
                        name: 'William B Ropp',
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
                    ],
                  },
                  {
                    name: 'John C Barnes',
                    friends: [
                      {
                        name: 'William B Ropp',
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
  });
});

test('Content property in parameter object', () => {
  const query = `{
    coordinates(lat: 3, long: 5) {
      lat,
      long
    }
  }`;

  return graphql(createdSchema, query).then(result => {
    expect(result).toEqual({
      data: {
        coordinates: {
          lat: 8,
          long: 10,
        },
      },
    });
  });
});

test('Handle objects without defined properties with arbitrary GraphQL JSON type', () => {
  const query = `{
    trashcan(username:"arlene") {
      brand,
      contents
    }
    trashcans {
      contents
    }
  }`;

  return graphql(createdSchema, query).then(result => {
    expect(result).toEqual({
      data: {
        trashcan: {
          brand: 'Garbage Emporium',
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
        trashcans: [
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
});

test('Handle input objects without defined properties with arbitrary GraphQL JSON type', () => {
  const query = `mutation {
    postOfficeTrashCan(trashcan2Input: {
      type: "sandwich",
      message: "moldy",
      tasteRating: 0
    }, username: "arlene") {
      brand
      contents
    }
  }`;

  return graphql(createdSchema, query).then(result => {
    expect(result).toEqual({
      data: {
        postOfficeTrashCan: {
          brand: 'Garbage Emporium',
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
});

test('Generate "Equivalent to..." messages', () => {
  const options: Options = {
    // Used to simplify test. Otherwise viewers will polute query/mutation fields.
    viewer: false,
    fetch,
  };

  // Check if query/mutation fields have the message
  const query = `query {
    __schema {
      queryType {
        fields {
          type {
            name
          }
          description
        }
      }
      mutationType {
        fields {
          type {
            name
          }
          description
        }
      }
    }
  }`;

  const promise = openAPIToGraphQL.createGraphQLSchema(oas, options).then(({ schema }) => {
    const ast = parse(query);
    const errors = validate(schema, ast);
    expect(errors).toEqual([]);
    return graphql(schema, query).then(result => {
      // Make sure all query fields have the message
      expect(
        result.data.__schema.queryType.fields.every((field: { description: string | string[] }) => {
          return field.description.includes('\n\nEquivalent to GET ');
        })
      ).toBe(true);

      // Make sure all mutation fields have the message
      expect(
        result.data.__schema.mutationType.fields.every((field: { description: string | string[] }) => {
          return field.description.includes('\n\nEquivalent to ');
        })
      ).toBe(true);

      // Check full message on a particular field
      expect(
        result.data.__schema.queryType.fields.find((field: { type: { name: string } }) => {
          return field.type.name === 'Car';
        })
      ).toEqual({
        type: {
          name: 'Car',
        },
        description: 'Returns a car to test nesting of sub operations\n\nEquivalent to GET /users/{username}/car',
      });
    });
  });

  // Check link field description
  const query2 = `query {
    __type(name: "User") {
      fields {
        type {
          name
        }
        description
      }
    }
  }`;

  const promise2 = graphql(createdSchema, query2).then(result => {
    expect(
      result.data.__type.fields.find((field: { type: { name: string } }) => {
        return field.type.name === 'Company';
      })
    ).toEqual({
      type: {
        name: 'Company',
      },
      description: "Allows to fetch the user's employer company.\n\nEquivalent to GET /companies/{id}",
    });
  });

  return Promise.all([promise, promise2]);
});

test('Withhold "Equivalent to..." messages', () => {
  const options: Options = {
    // Used to simplify test. Otherwise viewers will polute query/mutation fields.
    viewer: false,
    equivalentToMessages: false,
    fetch,
  };

  // Check query/mutation field descriptions
  const query = `query {
    __schema {
      queryType {
        fields {
          type {
            name
          }
          description
        }
      }
      mutationType {
        fields {
          type {
            name
          }
          description
        }
      }
    }
  }`;

  const promise = openAPIToGraphQL.createGraphQLSchema(oas, options).then(({ schema }) => {
    const ast = parse(query);
    const errors = validate(schema, ast);
    expect(errors).toEqual([]);
    return graphql(schema, query).then(result => {
      expect(
        result.data.__schema.queryType.fields.every((field: { description: string | string[] }) => {
          return field.description.includes('\n\nEquivalent to GET ');
        })
      ).toBe(false);

      expect(
        result.data.__schema.mutationType.fields.every((field: { description: string | string[] }) => {
          return field.description.includes('\n\nEquivalent to ');
        })
      ).toBe(false);
    });
  });

  // Check link field description
  const query2 = `query {
    __type(name: "User") {
      fields {
        type {
          name
        }
        description
      }
    }
  }`;

  const promise2 = openAPIToGraphQL.createGraphQLSchema(oas, options).then(({ schema }) => {
    const ast = parse(query);
    const errors = validate(schema, ast);
    expect(errors).toEqual([]);
    return graphql(schema, query2).then(result => {
      expect(
        result.data.__type.fields.find((field: { type: { name: string } }) => {
          return field.type.name === 'Company';
        })
      ).toEqual({
        type: {
          name: 'Company',
        },
        description: "Allows to fetch the user's employer company.",
      });
    });
  });

  return Promise.all([promise, promise2]);
});

test('UUID format becomes GraphQL ID type', () => {
  const query = `{
    __type(name: "Company") {
      fields {
        name
        type {
          name
          kind
        }
      }
    }
  }`;

  return graphql(createdSchema, query).then(result => {
    expect(
      result.data.__type.fields.find((field: { name: string }) => {
        return field.name === 'id';
      })
    ).toEqual({
      name: 'id',
      type: {
        name: 'ID',
        kind: 'SCALAR',
      },
    });
  });
});

test('Option idFormats', () => {
  const options: Options = {
    idFormats: ['specialIdFormat'],
    fetch,
  };

  // Check query/mutation field descriptions
  const query = `{
    __type(name: "PatentWithId") {
      fields {
        name
        type {
          kind
          ofType {
            name
            kind
          }
        }
      }
    }
  }`;

  return openAPIToGraphQL.createGraphQLSchema(oas, options).then(({ schema }) => {
    const ast = parse(query);
    const errors = validate(schema, ast);
    expect(errors).toEqual([]);
    return graphql(schema, query).then(result => {
      expect(
        result.data.__type.fields.find((field: { name: string }) => {
          return field.name === 'patentId';
        })
      ).toEqual({
        name: 'patentId',
        type: {
          kind: 'NON_NULL',
          ofType: {
            name: 'ID',
            kind: 'SCALAR',
          },
        },
      });
    });
  });
});

test('Required properties for input object types', () => {
  const userInputType = createdSchema.getType('UserInput') as GraphQLInputObjectType;

  // The exclamation mark shows that it is a required (non-nullable) property
  expect(userInputType.toConfig().fields.address.type.toString()).toEqual('AddressInput!');
  expect(userInputType.toConfig().fields.address2.type.toString()).toEqual('AddressInput');
});

test('Option selectQueryOrMutationField', () => {
  const query = `{
    __schema {
      queryType {
        fields {
          name
          description
        }
      }
      mutationType {
        fields {
          name
          description
        }
      }
    }
  }`;

  // The users field should exist as a Query field
  const promise = graphql(createdSchema, query).then(result => {
    expect(
      result.data.__schema.queryType.fields.find((field: { name: string }) => {
        return field.name === 'user';
      })
    ).toEqual({
      name: 'user',
      description: 'Returns a user from the system.\n\nEquivalent to GET /users/{username}',
    });

    expect(
      result.data.__schema.mutationType.fields.find((field: { name: string }) => {
        return field.name === 'user';
      })
    ).toEqual(undefined);
  });

  const options: Options = {
    selectQueryOrMutationField: {
      'Example API': {
        '/users/{username}': {
          get: GraphQLOperationType.Mutation,
        },
      },
    },
    fetch,
  };

  // The users (now named getUserByUsername) field should exist as a Mutation field
  const promise2 = openAPIToGraphQL.createGraphQLSchema(oas, options).then(({ schema }) => {
    const ast = parse(query);
    const errors = validate(schema, ast);
    expect(errors).toEqual([]);
    return graphql(schema, query).then(result => {
      expect(
        result.data.__schema.queryType.fields.find((field: { name: string }) => {
          return field.name === 'getUserByUsername';
        })
      ).toEqual(undefined);

      expect(
        result.data.__schema.mutationType.fields.find((field: { name: string }) => {
          return field.name === 'getUserByUsername';
        })
      ).toEqual({
        name: 'getUserByUsername',
        description: 'Returns a user from the system.\n\nEquivalent to GET /users/{username}',
      });
    });
  });

  return Promise.all([promise, promise2]);
});

test('Header arguments are not created when they are provided through headers option', () => {
  // The GET snack operation has a snack_type and snack_size header arguments
  const options: Options = {
    headers: {
      snack_type: 'chips',
      snack_size: 'large',
    },
    fetch,
  };

  const query = `{
    __schema {
      queryType {
        fields {
          name
          args {
            name
          }
        }
      }
    }
  }`;

  return openAPIToGraphQL.createGraphQLSchema(oas, options).then(({ schema }) => {
    const ast = parse(query);
    const errors = validate(schema, ast);
    expect(errors).toEqual([]);
    return graphql(schema, query).then(result => {
      expect(
        result.data.__schema.queryType.fields.find((field: { name: string }) => {
          return field.name === 'snack';
        })
      ).toEqual({
        name: 'snack',
        args: [], // No arguments
      });
    });
  });
});

test('Header arguments are not created when they are provided through requestOptions option', () => {
  // The GET snack operation has a snack_type and snack_size header arguments
  const options: Options = {
    requestOptions: {
      headers: {
        snack_type: 'chips',
        snack_size: 'large',
      },
    },
    fetch,
  };

  const query = `{
    __schema {
      queryType {
        fields {
          name
          args {
            name
          }
        }
      }
    }
  }`;

  return openAPIToGraphQL.createGraphQLSchema(oas, options).then(({ schema }) => {
    const ast = parse(query);
    const errors = validate(schema, ast);
    expect(errors).toEqual([]);
    return graphql(schema, query).then(result => {
      expect(
        result.data.__schema.queryType.fields.find((field: { name: string }) => {
          return field.name === 'snack';
        })
      ).toEqual({
        name: 'snack',
        args: [], // No arguments
      });
    });
  });
});

test('Query string arguments are not created when they are provided through qs option', () => {
  // The GET status operation has a limit query string parameter
  const options: Options = {
    qs: {
      limit: '10',
    },
    fetch,
  };

  const query = `{
    __schema {
      queryType {
        fields {
          name
          args {
            name
          }
        }
      }
    }
  }`;

  return openAPIToGraphQL.createGraphQLSchema(oas, options).then(({ schema }) => {
    const ast = parse(query);
    const errors = validate(schema, ast);
    expect(errors).toEqual([]);
    return graphql(schema, query).then(result => {
      expect(
        result.data.__schema.queryType.fields.find((field: { name: string }) => {
          return field.name === 'users';
        })
      ).toEqual({
        name: 'users',
        args: [], // No arguments
      });
    });
  });
});

test('Non-nullable properties for object types', () => {
  const coordinates = createdSchema.getType('Coordinates') as GraphQLObjectType;

  // The exclamation mark shows that it is a required (non-nullable) property
  expect(coordinates.toConfig().fields.lat.type.toString()).toEqual('Float!');
  expect(coordinates.toConfig().fields.long.type.toString()).toEqual('Float!');
});

test('Option genericPayloadArgName', () => {
  const query = `{
    __schema {
      mutationType {
        fields {
          name
          args {
            name
          }
        }
      }
    }
  }`;

  // The postUser field should have a userInput argument
  const promise = graphql(createdSchema, query).then(result => {
    expect(
      result.data.__schema.mutationType.fields.find((field: { name: string }) => {
        return field.name === 'postUser';
      })
    ).toEqual({
      name: 'postUser',
      args: [
        {
          name: 'userInput',
        },
      ],
    });
  });

  const options: Options = {
    genericPayloadArgName: true,
    fetch,
  };

  // The postUser field should now have a requestPody argument
  const promise2 = openAPIToGraphQL.createGraphQLSchema(oas, options).then(({ schema }) => {
    const ast = parse(query);
    const errors = validate(schema, ast);
    expect(errors).toEqual([]);
    return graphql(schema, query).then(result => {
      expect(
        result.data.__schema.mutationType.fields.find((field: { name: string }) => {
          return field.name === 'postUser';
        })
      ).toEqual({
        name: 'postUser',
        args: [
          {
            name: 'requestBody',
          },
        ],
      });
    });
  });

  return Promise.all([promise, promise2]);
});

test('Non-nullable properties from nested allOf', () => {
  // Check query/mutation field descriptions
  const query = `{
    __type(name: "Nomenclature") {
      fields {
        name
        type {
          kind
          ofType {
            name
            kind
          }
        }
      }
    }
  }`;

  return openAPIToGraphQL.createGraphQLSchema(oas, { fetch }).then(({ schema }) => {
    const ast = parse(query);
    const errors = validate(schema, ast);
    expect(errors).toEqual([]);
    return graphql(schema, query).then(result => {
      expect(
        result.data.__type.fields.find((field: { name: string }) => {
          return field.name === 'family';
        })
      ).toEqual({
        name: 'family',
        type: {
          kind: 'NON_NULL',
          ofType: {
            name: 'String',
            kind: 'SCALAR',
          },
        },
      });
    });
  });
});
