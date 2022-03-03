// Copyright IBM Corp. 2017,2018. All Rights Reserved.
// Node module: openapi-to-graphql
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

/* globals beforeAll, test, expect */

import { graphql, parse, validate, GraphQLSchema } from 'graphql';

import * as openAPIToGraphQL from '../src/openapi-to-graphql/index';
import { Options } from '../src/openapi-to-graphql/types/options';
import { startServer, stopServer } from './example_api6_server';
import { fetch } from 'cross-undici-fetch';

const oas = require('./fixtures/example_oas6.json');
const PORT = 3008;
// Update PORT for this test case:
oas.servers[0].variables.port.default = String(PORT);

let createdSchema: GraphQLSchema;

/**
 * Set up the schema first and run example API server
 */
beforeAll(() => {
  return Promise.all([
    openAPIToGraphQL.createGraphQLSchema(oas, { fetch }).then(({ schema }) => {
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

test('Option requestOptions should work with links', () => {
  // Verifying the behavior of the link by itself
  const query = `{
    object {
      object2Link {
        data
      }
      withParameter: object2Link (specialheader: "extra data"){
        data
      }
    }
  }`;

  const promise = graphql({ schema: createdSchema, source: query }).then((result: any) => {
    expect(result.data).toEqual({
      object: {
        object2Link: {
          data: 'object2',
        },
        withParameter: {
          data: "object2 with special header: 'extra data'",
        },
      },
    });
  });

  const options: Options<any, any, any> = {
    fetch,
    requestOptions: {
      headers: {
        specialheader: 'requestOptions',
      },
    },
  };

  const query2 = `{
    object {
      object2Link {
        data
      }
    }
  }`;

  const promise2 = openAPIToGraphQL.createGraphQLSchema(oas, options).then(({ schema }) => {
    const ast = parse(query2);
    const errors = validate(schema, ast);
    expect(errors).toEqual([]);
    return graphql({
      schema: schema,
      source: query2,
    }).then((result: any) => {
      expect(result).toEqual({
        data: {
          object: {
            object2Link: {
              data: "object2 with special header: 'requestOptions'", // Data from requestOptions in a link
            },
          },
        },
      });
    });
  });

  return Promise.all([promise, promise2]);
});

// Simple scalar fields on the request body
test('Simple request body using application/x-www-form-urlencoded', () => {
  const query = `mutation {
    postFormUrlEncoded (petInput: {
      name: "Mittens",
      status: "healthy",
      weight: 6
    }) {
      name
      status
      weight
    }
  }`;

  return graphql({ schema: createdSchema, source: query }).then((result: any) => {
    expect(result.data).toEqual({
      postFormUrlEncoded: {
        name: 'Mittens',
        status: 'healthy',
        weight: 6,
      },
    });
  });
});

/**
 * The field 'previousOwner' should be desanitized to 'previous_owner'
 *
 * Status is a required field so it is also included
 */
test('Request body using application/x-www-form-urlencoded and desanitization of field name', () => {
  const query = `mutation {
    postFormUrlEncoded (petInput: {
      previousOwner: "Martin",
      status: "healthy"
    }) {
      previousOwner
    }
  }`;

  return graphql({ schema: createdSchema, source: query }).then((result: any) => {
    expect(result.data).toEqual({
      postFormUrlEncoded: {
        previousOwner: 'Martin',
      },
    });
  });
});

/**
 * The field 'history' is an object
 *
 * Status is a required field so it is also included
 */
test('Request body using application/x-www-form-urlencoded containing object', () => {
  const query = `mutation {
    postFormUrlEncoded (petInput: {
      history: {
        data: "Friendly"
      }
      status: "healthy"
    }) {
      history {
        data
      }
    }
  }`;

  return graphql({ schema: createdSchema, source: query }).then((result: any) => {
    expect(result.data).toEqual({
      postFormUrlEncoded: {
        history: {
          data: 'Friendly',
        },
      },
    });
  });
});

test('Request body using application/x-www-form-urlencoded containing object with no properties', () => {
  const query = `mutation {
    postFormUrlEncoded (petInput: {
      history2: {
        data: "Friendly"
      }
      status: "healthy"
    }) {
      history2
    }
  }`;

  return graphql({ schema: createdSchema, source: query }).then((result: any) => {
    expect(result.data).toEqual({
      postFormUrlEncoded: {
        history2: {
          data: 'Friendly',
        },
      },
    });
  });
});

/**
 * '/cars/{id}' should create a 'car' field
 *
 * Also the path parameter just contains the term 'id'
 */
test('inferResourceNameFromPath() field with simple plural form', () => {
  const query = `{
    car (id: "Super Speed")
  }`;

  return graphql({ schema: createdSchema, source: query }).then((result: any) => {
    expect(result.data).toEqual({
      car: 'Car ID: Super Speed',
    });
  });
});

//
/**
 * '/cacti/{cactusId}' should create an 'cactus' field
 *
 * Also the path parameter is the combination of the singular form and 'id'
 */
test('inferResourceNameFromPath() field with irregular plural form', () => {
  const query = `{
    cactus (cactusId: "Spikey")
  }`;

  return graphql({ schema: createdSchema, source: query }).then((result: any) => {
    expect(result.data).toEqual({
      cactus: 'Cactus ID: Spikey',
    });
  });
});

/**
 * '/eateries/{eatery}/breads/{breadName}/dishes/{dishKey}/ should create an
 * 'eateryBreadDish' field
 *
 * The path parameters are the singular form, some combination with the term
 * 'name', and some combination with the term 'key'
 */
test('inferResourceNameFromPath() field with long path', () => {
  const query = `{
  eateryBreadDish(eatery: "Mike's", breadName:"challah", dishKey: "bread pudding")
 }`;

  return graphql({ schema: createdSchema, source: query }).then((result: any) => {
    expect(result.data).toEqual({
      eateryBreadDish: "Parameters combined: Mike's challah bread pudding",
    });
  });
});
