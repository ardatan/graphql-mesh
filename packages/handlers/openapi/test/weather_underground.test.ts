// Copyright IBM Corp. 2017,2018. All Rights Reserved.
// Node module: openapi-to-graphql
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

/* globals beforeAll, test, expect */

import * as openAPIToGraphQL from '../src/openapi-to-graphql/index';
import { GraphQLSchema } from 'graphql';

/**
 * Set up the schema first
 */
const oas = require('./fixtures/weather_underground.json');

let createdSchema: GraphQLSchema;
beforeAll(() => {
  return openAPIToGraphQL.createGraphQLSchema(oas).then(({ schema, report }) => {
    createdSchema = schema;
  });
});

test('All Weather Underground query endpoints present', () => {
  let oasGetCount = 0;
  for (const path in oas.paths) {
    for (const method in oas.paths[path]) {
      if (method === 'get') oasGetCount++;
    }
  }
  const gqlTypes = Object.keys(createdSchema.getQueryType().getFields()).length;
  expect(gqlTypes).toEqual(oasGetCount);
});
