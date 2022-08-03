'use strict';

/* globals beforeAll, test, expect */

import * as openAPIToGraphQL from '../src/openapi-to-graphql/index';
import { GraphQLSchema, graphql, parse, validate } from 'graphql';
import { fetch } from '@whatwg-node/fetch';
import { startServer, stopServer } from './nested_objects_server';

const oas = require('./fixtures/nested_object.json');
const PORT = 3009;
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

test('Get response', async () => {
  const query = `{
    searchResult(
      collectionName: "CHECKOUT_SUPER_PRODUCT"
      searchParameters: {q: "water", queryBy: "name"}
    ) {
      hits {
        document
      }
    }
  }`;

  const ast = parse(query);
  const errors = validate(createdSchema, ast);
  expect(errors).toEqual([]);
  return graphql({ schema: createdSchema, source: query }).then((result: any) => {
    expect(result).toEqual({
      data: {
        searchResult: {
          hits: [
            {
              document: 'Something goes here',
            },
          ],
        },
      },
    });
  });
});
